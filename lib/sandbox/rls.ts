import { ROLE_RANK } from "@/lib/auth/rbac";
import { verifyAccessToken } from "@/lib/oauth/signer";
import {
  type DelegationClaims,
  delegationClaimsSchema,
} from "@/lib/sandbox/claims";

export type RlsDeniedCode =
  | "invalid_claims"
  | "not_delegation"
  | "uid_mismatch"
  | "missing_scope";

export class RlsDeniedError extends Error {
  readonly code: RlsDeniedCode;

  constructor(code: RlsDeniedCode, message: string) {
    super(message);
    this.name = "RlsDeniedError";
    this.code = code;
  }
}

function hasScope(scope: string, required: string): boolean {
  return scope.split(" ").includes(required);
}

/**
 * Minimal container-sandbox RLS gate (mirrors `auth.uid() = owner` policies):
 * only 60s delegation tokens authenticate, the subject must own the resource
 * (admin roles override), and the delegation scope must cover the action.
 * Fail-closed: every refusal throws {@link RlsDeniedError}.
 */
export async function authorizeContainerAccess(input: {
  token: string;
  requiredScope: string;
  resourceOwnerId: string;
}): Promise<DelegationClaims> {
  const { token, requiredScope, resourceOwnerId } = input;

  let payload: unknown;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    throw new RlsDeniedError(
      "invalid_claims",
      "subject token is invalid or expired",
    );
  }

  const parsed = delegationClaimsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RlsDeniedError(
      "invalid_claims",
      `delegation claims invalid: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  const claims = parsed.data;

  if (claims.use !== "delegation") {
    throw new RlsDeniedError(
      "not_delegation",
      "only delegation tokens may drive the container sandbox",
    );
  }

  const isOwner = claims.sub === resourceOwnerId;
  const isAdmin = ROLE_RANK[claims.role] >= ROLE_RANK["admin"];
  if (!isOwner && !isAdmin) {
    throw new RlsDeniedError(
      "uid_mismatch",
      "subject does not own the target resource",
    );
  }

  if (!hasScope(claims.scope, requiredScope)) {
    throw new RlsDeniedError(
      "missing_scope",
      `delegation scope does not cover ${requiredScope}`,
    );
  }

  return claims;
}
