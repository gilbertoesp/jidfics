import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClient, from, select, eq, maybeSingle } = vi.hoisted(
  () => ({
    createServiceClient: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

import { findClient, isJtiDenylisted } from "@/lib/oauth/store";

const clientRow = {
  client_id: "schedule-agent",
  secret_hash: "deadbeef",
  allowed_scopes: ["schedule:read"],
  allowed_audiences: ["https://jidfics.vercel.app/api"],
  allowed_tier: "user",
};

describe("findClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServiceClient.mockReturnValue({ from });
    from.mockImplementation(() => ({ select }));
    select.mockImplementation(() => ({ eq }));
    eq.mockImplementation(() => ({ maybeSingle }));
  });

  it("returns the client row for a known client_id", async () => {
    maybeSingle.mockResolvedValue({ data: clientRow, error: null });

    const found = await findClient("schedule-agent");

    expect(from).toHaveBeenCalledWith("oauth_clients");
    expect(found).toEqual(clientRow);
  });

  it("returns null when no client matches", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await findClient("ghost")).toBeNull();
  });

  it("fails closed (null) when the query errors", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "relation unavailable" },
    });

    expect(await findClient("schedule-agent")).toBeNull();
  });
});

describe("isJtiDenylisted", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServiceClient.mockReturnValue({ from });
    from.mockImplementation(() => ({ select }));
    select.mockImplementation(() => ({ eq }));
    eq.mockImplementation(() => ({ maybeSingle }));
  });

  it("returns true when the jti is denylisted", async () => {
    maybeSingle.mockResolvedValue({ data: { jti: "revoked-1" }, error: null });

    expect(await isJtiDenylisted("revoked-1")).toBe(true);
    expect(from).toHaveBeenCalledWith("token_denylist");
  });

  it("returns false for an unknown jti", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await isJtiDenylisted("fresh-1")).toBe(false);
  });

  it("fails closed (true) when the query errors", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "relation unavailable" },
    });

    expect(await isJtiDenylisted("any-jti")).toBe(true);
  });
});
