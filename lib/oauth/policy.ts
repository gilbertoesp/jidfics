import { z } from "zod";
import { ROLE_RANK, type Role } from "@/lib/auth/rbac";

export const TOKEN_EXCHANGE_GRANT =
  "urn:ietf:params:oauth:grant-type:token-exchange";
export const ACCESS_TOKEN_TYPE =
  "urn:ietf:params:oauth:token-type:access_token";
export const ACCESS_TOKEN_TTL_SECONDS = 300;
export const PRIMARY_SUBJECT_TYPE = "urn:jidfics:token-type:primary";
export const DELEGATION_TOKEN_TYPE = "urn:jidfics:token-type:delegation";
export const DELEGATION_TTL_SECONDS = 60;
export const DELEGATION_USE = "delegation";
export const ACCESS_TOKEN_USE = "access";

/** RFC 6749-style error carried to the HTTP boundary. */
export class OAuthPolicyError extends Error {
  readonly error: string;

  constructor(error: string, message: string) {
    super(message);
    this.name = "OAuthPolicyError";
    this.error = error;
  }
}

/** Boundary schema for POST /api/oauth/token (form-encoded body). */
export const tokenExchangeRequestSchema = z.object({
  grant_type: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  subject_token: z.string().min(1),
  subject_token_type: z.union([
    z.literal(ACCESS_TOKEN_TYPE),
    z.literal(PRIMARY_SUBJECT_TYPE),
  ]),
  requested_token_type: z
    .union([z.literal(ACCESS_TOKEN_TYPE), z.literal(DELEGATION_TOKEN_TYPE)])
    .optional(),
  actor_token: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  audience: z.string().min(1),
});

/**
 * Delegation can only narrow: the requested scope must be a subset of the
 * allowed scope. Throws `invalid_scope` otherwise.
 */
export function narrowScope(allowed: string, requested?: string): string {
  if (!requested) {
    return allowed;
  }
  const allowedSet = new Set(allowed.split(" "));
  const requestedList = requested.split(" ");
  const rejected = requestedList.filter((s) => !allowedSet.has(s));
  if (rejected.length > 0) {
    throw new OAuthPolicyError(
      "invalid_scope",
      `scope not allowed: ${rejected.join(" ")}`,
    );
  }
  return requestedList.join(" ");
}

/**
 * Default grant: the scopes both parties hold, preserving the first
 * argument's order. Never throws — absence of a request means "as much as
 * both allow", not an error.
 */
export function intersectScopes(first: string, second: string): string {
  const secondSet = new Set(second.split(" "));
  return first
    .split(" ")
    .filter((s) => secondSet.has(s))
    .join(" ");
}

/** A delegated token can never carry a higher tier than either party holds. */
export function capTier(subjectRole: Role, clientTier: Role): Role {
  return ROLE_RANK[subjectRole] <= ROLE_RANK[clientTier]
    ? subjectRole
    : clientTier;
}
