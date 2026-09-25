import { resolveRoutePolicy } from "./policy";
import { hasRole, type Role } from "./rbac";

/**
 * Pure request-decision engine for proxy.ts.
 *
 * Combines the declarative route policy with the session state and returns an
 * explicit action — proxy.ts only translates actions into responses, so this
 * module stays testable without Next.js or Auth.js.
 */

export type GateInput = {
  pathname: string;
  method: string;
  isAuthenticated: boolean;
  role?: Role | null;
};

export type GateDecision =
  | { action: "next" }
  | { action: "login"; callbackUrl: string }
  | { action: "away-from-login" }
  | { action: "forbidden" }
  | { action: "not-found" };

export function decideGate(input: GateInput): GateDecision {
  const policy = resolveRoutePolicy(input.pathname, input.method);

  if (policy.kind === "denied") {
    return { action: "not-found" };
  }

  if (input.isAuthenticated && input.pathname === "/auth/login") {
    return { action: "away-from-login" };
  }

  if (policy.kind === "public") {
    return { action: "next" };
  }

  if (!input.isAuthenticated) {
    return { action: "login", callbackUrl: input.pathname };
  }

  if (policy.kind === "authenticated") {
    return { action: "next" };
  }

  return hasRole(input.role ?? null, policy.role)
    ? { action: "next" }
    : { action: "forbidden" };
}
