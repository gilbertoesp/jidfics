/**
 * Tiered role claims — pure authorization kernel (zero-trust).
 *
 * No I/O, no env, no Auth.js types: callers pass the session role in as data,
 * so this module is the single authority for `user < admin < super_admin`
 * ordering (deny-by-default, unknown = no access).
 */

export type Role = "user" | "admin" | "super_admin";

/** Monotonic tier ranking; higher number = more privilege. */
export const ROLE_RANK: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

export type RoleErrorCode = "unauthenticated" | "insufficient_role";

export class RoleError extends Error {
  readonly code: RoleErrorCode;
  readonly required: Role;
  readonly actual: Role | null | undefined;

  constructor(
    code: RoleErrorCode,
    required: Role,
    actual: Role | null | undefined,
  ) {
    super(
      code === "unauthenticated"
        ? `Unauthenticated: ${required} role required`
        : `Insufficient role: requires ${required}, actual ${String(actual)}`,
    );
    this.name = "RoleError";
    this.code = code;
    this.required = required;
    this.actual = actual;
  }
}

function rankOf(role: Role | null | undefined): number | undefined {
  if (role === null || role === undefined) {
    return undefined;
  }
  return ROLE_RANK[role];
}

export function hasRole(
  actual: Role | null | undefined,
  required: Role,
): boolean {
  const actualRank = rankOf(actual);
  const requiredRank = rankOf(required);
  if (actualRank === undefined || requiredRank === undefined) {
    return false;
  }
  return actualRank >= requiredRank;
}

export function requireRole(
  actual: Role | null | undefined,
  required: Role,
): void {
  if (actual === null || actual === undefined) {
    throw new RoleError("unauthenticated", required, actual);
  }
  if (!hasRole(actual, required)) {
    throw new RoleError("insufficient_role", required, actual);
  }
}
