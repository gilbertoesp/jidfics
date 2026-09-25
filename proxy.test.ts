import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: (handler: unknown) => handler,
}));

type FakeReq = {
  url: string;
  method: string;
  nextUrl: URL;
  auth: unknown;
};

function makeReq(path: string, method = "GET", auth: unknown = null): FakeReq {
  const url = `http://localhost:3000${path}`;
  return { url, method, nextUrl: new URL(url), auth };
}

async function run(proxy: unknown, req: FakeReq): Promise<Response> {
  return (proxy as (r: FakeReq) => Response | Promise<Response>)(req);
}

type ProxyModule = { default: unknown; config: { matcher: string[] } };

describe("proxy.ts — request gate (Auth.js mocked at the exit seam)", () => {
  let proxy: ProxyModule;

  beforeEach(async () => {
    vi.resetModules();
    proxy = (await import("@/proxy")) as ProxyModule;
  });

  it("passes the public schedule root", async () => {
    const res = await run(proxy.default, makeReq("/"));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated /protected to login with callbackUrl", async () => {
    const res = await run(proxy.default, makeReq("/protected/deep"));
    expect([302, 307]).toContain(res.status);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("callbackUrl")).toBe("/protected/deep");
  });

  it("redirects authenticated visitors away from the login page", async () => {
    const res = await run(
      proxy.default,
      makeReq("/auth/login", "GET", { user: { id: "u1", role: null } }),
    );
    expect([302, 307]).toContain(res.status);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe(
      "/protected",
    );
  });

  it("forbids /admin when the session has no role claim", async () => {
    const res = await run(
      proxy.default,
      makeReq("/admin", "GET", { user: { id: "u1", role: null } }),
    );
    expect(res.status).toBe(403);
  });

  it("passes /admin for an admin-tier session", async () => {
    const res = await run(
      proxy.default,
      makeReq("/admin", "GET", { user: { id: "u1", role: "admin" } }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown paths (deny by default)", async () => {
    const res = await run(
      proxy.default,
      makeReq("/whatever", "GET", { user: { id: "u1", role: "super_admin" } }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for methods outside the allowlist", async () => {
    const res = await run(
      proxy.default,
      makeReq("/api/auth/session", "DELETE", {
        user: { id: "u1", role: "user" },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("keeps an explicit matcher so static assets skip the gate", () => {
    expect(Array.isArray(proxy.config.matcher)).toBe(true);
    expect(proxy.config.matcher.length).toBeGreaterThan(0);
  });
});
