import { z } from "zod";
import type { DelegationClaims } from "@/lib/sandbox/claims";
import {
  authorizeContainerAccess,
  hasScope,
  RlsDeniedError,
  verifyDelegationClaims,
} from "@/lib/sandbox/rls";

/**
 * Explicit per-table/action RLS policy registry for containerized sandbox
 * data access. Fail-closed: a table or action absent from the registry is
 * never permitted. `ownership:"owner"` mirrors `auth.uid() = owner` (admin
 * roles override); `ownership:"none"` requires only an authenticated
 * delegation covering the action's scope.
 */
const actionPolicySchema = z.object({
  scope: z.string().min(1),
  ownership: z.enum(["owner", "none"]),
});

export const sandboxPolicySchema = z.record(
  z.string().min(1),
  z.record(z.string().min(1), actionPolicySchema),
);

export type SandboxPolicies = z.infer<typeof sandboxPolicySchema>;

export const SANDBOX_POLICIES: SandboxPolicies = {
  notebooks: {
    read: { scope: "notebook:read", ownership: "owner" },
    write: { scope: "notebook:write", ownership: "owner" },
  },
  schedule: {
    read: { scope: "schedule:read", ownership: "none" },
  },
};

/**
 * Authorize one sandbox data access ({table, action}) for a delegation
 * token. Owner-mode delegates to {@link authorizeContainerAccess}; none-mode
 * authenticates and checks scope coverage only.
 */
export async function authorizeDataAccess(input: {
  token: string;
  table: string;
  action: string;
  rowOwnerId: string;
}): Promise<DelegationClaims> {
  const { token, table, action, rowOwnerId } = input;

  const policy = SANDBOX_POLICIES[table]?.[action];
  if (!policy) {
    throw new RlsDeniedError(
      "unknown_resource",
      `no sandbox policy for ${table}.${action}`,
    );
  }

  if (policy.ownership === "owner") {
    return authorizeContainerAccess({
      token,
      requiredScope: policy.scope,
      resourceOwnerId: rowOwnerId,
    });
  }

  const claims = await verifyDelegationClaims(token);
  if (!hasScope(claims.scope, policy.scope)) {
    throw new RlsDeniedError(
      "missing_scope",
      `delegation scope does not cover ${policy.scope}`,
    );
  }
  return claims;
}
