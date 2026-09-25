import { describe, expect, it } from "vitest";
import { decideGate } from "./gate";

describe("lib/auth/gate.ts — proxy decision engine", () => {
  it("lets public routes through without a session", () => {
    expect(
      decideGate({ pathname: "/", method: "GET", isAuthenticated: false }),
    ).toEqual({ action: "next" });
    expect(
      decideGate({
        pathname: "/auth/login",
        method: "GET",
        isAuthenticated: false,
      }),
    ).toEqual({ action: "next" });
  });

  it("sends unauthenticated visitors to login with a callbackUrl", () => {
    expect(
      decideGate({
        pathname: "/protected/deep",
        method: "GET",
        isAuthenticated: false,
      }),
    ).toEqual({ action: "login", callbackUrl: "/protected/deep" });
    expect(
      decideGate({ pathname: "/admin", method: "GET", isAuthenticated: false }),
    ).toEqual({ action: "login", callbackUrl: "/admin" });
  });

  it("keeps authenticated visitors off the login page", () => {
    expect(
      decideGate({
        pathname: "/auth/login",
        method: "GET",
        isAuthenticated: true,
        role: "user",
      }),
    ).toEqual({ action: "away-from-login" });
  });

  it("passes authenticated visitors to authenticated routes", () => {
    expect(
      decideGate({
        pathname: "/protected",
        method: "GET",
        isAuthenticated: true,
        role: "user",
      }),
    ).toEqual({ action: "next" });
    expect(
      decideGate({
        pathname: "/protected",
        method: "GET",
        isAuthenticated: true,
        role: null,
      }),
    ).toEqual({ action: "next" });
  });

  it("forbids role-gated routes below the required tier", () => {
    expect(
      decideGate({
        pathname: "/admin/users",
        method: "GET",
        isAuthenticated: true,
        role: null,
      }),
    ).toEqual({ action: "forbidden" });
    expect(
      decideGate({
        pathname: "/admin",
        method: "GET",
        isAuthenticated: true,
        role: "user",
      }),
    ).toEqual({ action: "forbidden" });
  });

  it("passes role-gated routes at or above the required tier", () => {
    expect(
      decideGate({
        pathname: "/admin",
        method: "GET",
        isAuthenticated: true,
        role: "admin",
      }),
    ).toEqual({ action: "next" });
    expect(
      decideGate({
        pathname: "/admin/users",
        method: "GET",
        isAuthenticated: true,
        role: "super_admin",
      }),
    ).toEqual({ action: "next" });
  });

  it("denies unknown paths with not-found, even when authenticated", () => {
    expect(
      decideGate({
        pathname: "/whatever",
        method: "GET",
        isAuthenticated: true,
        role: "super_admin",
      }),
    ).toEqual({ action: "not-found" });
    expect(
      decideGate({
        pathname: "/api/unknown",
        method: "GET",
        isAuthenticated: false,
      }),
    ).toEqual({ action: "not-found" });
  });

  it("denies non-allowlisted methods with not-found", () => {
    expect(
      decideGate({
        pathname: "/api/auth/session",
        method: "DELETE",
        isAuthenticated: true,
        role: "user",
      }),
    ).toEqual({ action: "not-found" });
  });
});
