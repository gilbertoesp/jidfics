import type { Role } from "./rbac";

/**
 * Declarative route policy — the single authority for proxy.ts decisions.
 *
 * Zero-trust contract: an explicit rule grants access; anything that does not
 * match a rule (or matches with a non-allowlisted method) is `denied`.
 */

export type RoutePolicy =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "role"; role: Role }
  | { kind: "denied" };

type PolicyRule = {
  /** Path prefix (segment-aware) or exact path when `exact` is true. */
  path: string;
  exact?: boolean;
  /** Allowlisted HTTP methods (upper-case); absent = any method. */
  methods?: readonly string[];
  policy: RoutePolicy;
};

export const POLICY_RULES: readonly PolicyRule[] = [
  { path: "/", exact: true, policy: { kind: "public" } },
  { path: "/auth", policy: { kind: "public" } },
  {
    path: "/api/auth",
    methods: ["GET", "POST"],
    policy: { kind: "public" },
  },
  { path: "/protected", policy: { kind: "authenticated" } },
  { path: "/admin", policy: { kind: "role", role: "admin" } },
  { path: "/favicon.ico", exact: true, policy: { kind: "public" } },
  {
    path: "/opengraph-image.png",
    exact: true,
    policy: { kind: "public" },
  },
  { path: "/twitter-image.png", exact: true, policy: { kind: "public" } },
  { path: "/_next", policy: { kind: "public" } },
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function matchesPath(path: string, rule: PolicyRule): boolean {
  if (rule.exact) {
    return path === rule.path;
  }
  return path === rule.path || path.startsWith(`${rule.path}/`);
}

export function resolveRoutePolicy(
  pathname: string,
  method = "GET",
): RoutePolicy {
  const path = normalizePath(pathname);
  const upperMethod = method.toUpperCase();

  for (const rule of POLICY_RULES) {
    if (!matchesPath(path, rule)) {
      continue;
    }
    if (rule.methods && !rule.methods.includes(upperMethod)) {
      return { kind: "denied" };
    }
    return rule.policy;
  }

  return { kind: "denied" };
}
