import { describe, expect, it } from "vitest";
import { hasRole, ROLE_RANK, type Role, RoleError, requireRole } from "./rbac";

function caught(fn: () => void): unknown {
  try {
    fn();
    return undefined;
  } catch (err) {
    return err;
  }
}

describe("lib/auth/rbac.ts — tiered role claims", () => {
  describe("ROLE_RANK", () => {
    it("orders user < admin < super_admin", () => {
      expect(ROLE_RANK.user).toBeLessThan(ROLE_RANK.admin);
      expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.super_admin);
    });
  });

  describe("hasRole", () => {
    it("grants a role to its own tier", () => {
      expect(hasRole("user", "user")).toBe(true);
      expect(hasRole("admin", "admin")).toBe(true);
      expect(hasRole("super_admin", "super_admin")).toBe(true);
    });

    it("grants higher tiers access to lower-tier requirements", () => {
      expect(hasRole("admin", "user")).toBe(true);
      expect(hasRole("super_admin", "user")).toBe(true);
      expect(hasRole("super_admin", "admin")).toBe(true);
    });

    it("denies lower tiers access to higher-tier requirements", () => {
      expect(hasRole("user", "admin")).toBe(false);
      expect(hasRole("user", "super_admin")).toBe(false);
      expect(hasRole("admin", "super_admin")).toBe(false);
    });

    it("denies unauthenticated callers (null/undefined)", () => {
      expect(hasRole(null, "user")).toBe(false);
      expect(hasRole(undefined, "admin")).toBe(false);
      expect(hasRole(undefined, "user")).toBe(false);
    });

    it("denies unknown role strings (zero-trust: unknown = no access)", () => {
      expect(hasRole("root" as Role, "user")).toBe(false);
      expect(hasRole("" as Role, "user")).toBe(false);
    });
  });

  describe("requireRole", () => {
    it("resolves silently when the tier is sufficient", () => {
      expect(() => requireRole("admin", "user")).not.toThrow();
      expect(() => requireRole("super_admin", "super_admin")).not.toThrow();
      expect(() => requireRole("user", "user")).not.toThrow();
    });

    it("throws insufficient_role naming required and actual tiers", () => {
      const err = caught(() => requireRole("user", "admin"));
      expect(err).toBeInstanceOf(RoleError);
      const roleErr = err as RoleError;
      expect(roleErr.code).toBe("insufficient_role");
      expect(roleErr.required).toBe("admin");
      expect(roleErr.actual).toBe("user");
      expect(roleErr.message).toContain("admin");
    });

    it("throws unauthenticated when no role is present", () => {
      const err = caught(() => requireRole(null, "user"));
      expect(err).toBeInstanceOf(RoleError);
      expect((err as RoleError).code).toBe("unauthenticated");
      expect((err as RoleError).actual).toBeNull();
    });

    it("throws insufficient_role for unknown role strings", () => {
      const err = caught(() => requireRole("root" as Role, "user"));
      expect(err).toBeInstanceOf(RoleError);
      expect((err as RoleError).code).toBe("insufficient_role");
    });
  });
});
