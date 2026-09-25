import { z } from "zod";
import { ROLE_RANK, type Role } from "@/lib/auth/rbac";

/**
 * Runtime validation for the *primary* Supabase JWT claims consumed by the
 * token exchange (`app_metadata.roles`, `authorization.scopes`). The payload
 * shape is untrusted (Custom Access Token Hook output replaces the whole
 * claim set), so every field used for authorization is parsed here first.
 */
const roleSchema = z.enum(["user", "admin", "super_admin"]);

export const primaryIdentitySchema = z.object({
  sub: z.string().min(1),
  app_metadata: z.object({
    roles: z.array(roleSchema).min(1),
  }),
  authorization: z.object({ scopes: z.array(z.string().min(1)) }).optional(),
  jti: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
});

export type PrimaryIdentity = z.infer<typeof primaryIdentitySchema>;

/** Highest tier held by the primary identity (order-independent). */
export function highestRole(roles: Role[]): Role {
  return roles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best,
  );
}

/** `authorization.scopes` → space-delimited scope; absent claim → "". */
export function primaryScope(identity: PrimaryIdentity): string {
  return identity.authorization ? identity.authorization.scopes.join(" ") : "";
}

/** Identifier checked against the denylist: jti, else session_id. */
export function denylistId(identity: PrimaryIdentity): string | undefined {
  return identity.jti ?? identity.session_id;
}
