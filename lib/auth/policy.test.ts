import { describe, expect, it } from "vitest";
import { resolveRoutePolicy } from "./policy";

describe("lib/auth/policy.ts — deny-by-default route policy", () => {
  describe("public routes", () => {
    it("exposes the schedule root exactly", () => {
      expect(resolveRoutePolicy("/", "GET")).toEqual({ kind: "public" });
    });

    it("exposes the /auth flow (login, confirm, sign-up, …)", () => {
      expect(resolveRoutePolicy("/auth/login", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/auth/confirm", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/auth", "GET")).toEqual({ kind: "public" });
    });

    it("tolerates a trailing slash", () => {
      expect(resolveRoutePolicy("/auth/login/", "GET")).toEqual({
        kind: "public",
      });
    });

    it("exposes Auth.js handlers for GET and POST only", () => {
      expect(resolveRoutePolicy("/api/auth/callback/github", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/api/auth/session", "POST")).toEqual({
        kind: "public",
      });
    });

    it("matches HTTP methods case-insensitively", () => {
      expect(resolveRoutePolicy("/api/auth/session", "post")).toEqual({
        kind: "public",
      });
    });

    it("denies other methods on Auth.js handlers (method allowlist)", () => {
      expect(resolveRoutePolicy("/api/auth/session", "DELETE")).toEqual({
        kind: "denied",
      });
      expect(resolveRoutePolicy("/api/auth/callback/github", "PUT")).toEqual({
        kind: "denied",
      });
    });

    it("exposes static route-handler assets", () => {
      expect(resolveRoutePolicy("/favicon.ico", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/opengraph-image.png", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/twitter-image.png", "GET")).toEqual({
        kind: "public",
      });
      expect(resolveRoutePolicy("/_next/static/chunk.js", "GET")).toEqual({
        kind: "public",
      });
    });
  });

  describe("authenticated routes", () => {
    it("requires a session for /protected and its subtree", () => {
      expect(resolveRoutePolicy("/protected", "GET")).toEqual({
        kind: "authenticated",
      });
      expect(resolveRoutePolicy("/protected/deep/nested", "GET")).toEqual({
        kind: "authenticated",
      });
    });
  });

  describe("role-gated routes", () => {
    it("requires the admin tier for /admin and its subtree", () => {
      expect(resolveRoutePolicy("/admin", "GET")).toEqual({
        kind: "role",
        role: "admin",
      });
      expect(resolveRoutePolicy("/admin/users/42", "GET")).toEqual({
        kind: "role",
        role: "admin",
      });
    });
  });

  describe("deny by default", () => {
    it("denies unknown paths", () => {
      expect(resolveRoutePolicy("/whatever", "GET")).toEqual({
        kind: "denied",
      });
      expect(resolveRoutePolicy("/api/anything-else", "GET")).toEqual({
        kind: "denied",
      });
    });

    it("denies paths that only share a string prefix (segment boundary)", () => {
      expect(resolveRoutePolicy("/adminx", "GET")).toEqual({ kind: "denied" });
      expect(resolveRoutePolicy("/authx", "GET")).toEqual({ kind: "denied" });
      expect(resolveRoutePolicy("/protected-portal", "GET")).toEqual({
        kind: "denied",
      });
    });

    it("is case-sensitive (no accidental lowercase bypass)", () => {
      expect(resolveRoutePolicy("/Auth/login", "GET")).toEqual({
        kind: "denied",
      });
      expect(resolveRoutePolicy("/ADMIN", "GET")).toEqual({ kind: "denied" });
    });
  });
});
