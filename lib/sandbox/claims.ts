import { z } from "zod";

/**
 * Zod boundary for delegation-token claims consumed by the container
 * sandbox's RLS checks. `sub` is the `auth.uid()` source; `use` distinguishes
 * 60s downscoped delegation tokens from ordinary access tokens (policy
 * enforcement lives in `lib/sandbox/rls.ts`, not here).
 */
export const delegationClaimsSchema = z.object({
  sub: z.string().min(1),
  scope: z.string(),
  role: z.enum(["user", "admin", "super_admin"]),
  use: z.enum(["access", "delegation"]),
  jti: z.string().min(1),
  azp: z.string().min(1).optional(),
});

export type DelegationClaims = z.infer<typeof delegationClaimsSchema>;
