/**
 * Role tiers for zero-trust RBAC. One authority for ranking so claims,
 * delegation caps and route policies all compare the same way.
 */
export type Role = "user" | "admin" | "super_admin";

export const ROLE_RANK: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};
