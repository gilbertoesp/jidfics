import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_TYPE, TOKEN_EXCHANGE_GRANT } from "@/lib/oauth/policy";

const { signAccessToken, verifyAccessToken, findClient, isJtiDenylisted } =
  vi.hoisted(() => ({
    signAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    findClient: vi.fn(),
    isJtiDenylisted: vi.fn(),
  }));

vi.mock("@/lib/oauth/signer", () => ({ signAccessToken, verifyAccessToken }));
vi.mock("@/lib/oauth/store", () => ({ findClient, isJtiDenylisted }));

import { POST } from "@/app/api/oauth/token/route";

const CLIENT_SECRET = "s3cret-value";
const AUDIENCE = "https://jidfics.vercel.app/api";

const client = {
  client_id: "schedule-agent",
  secret_hash: createHash("sha256").update(CLIENT_SECRET).digest("hex"),
  allowed_scopes: ["schedule:read", "notebook:run"],
  allowed_audiences: [AUDIENCE],
  allowed_tier: "user",
};

const subjectClaims = {
  sub: "user-123",
  scope: "schedule:read notebook:run admin:moderate",
  role: "super_admin",
  jti: "jti-subject-1",
};

function tokenRequest(
  overrides: Record<string, string> = {},
  omit: string[] = [],
): Request {
  const params = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT,
    client_id: client.client_id,
    client_secret: CLIENT_SECRET,
    subject_token: "subject.jwt",
    subject_token_type: ACCESS_TOKEN_TYPE,
    audience: AUDIENCE,
    ...overrides,
  });
  for (const key of omit) {
    params.delete(key);
  }
  return new Request("http://localhost:3000/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

async function readError(res: Response) {
  return (await res.json()) as { error: string; error_description: string };
}

describe("POST /api/oauth/token (token exchange)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findClient.mockResolvedValue(client);
    verifyAccessToken.mockResolvedValue(subjectClaims);
    isJtiDenylisted.mockResolvedValue(false);
    signAccessToken.mockResolvedValue("signed.access.token");
  });

  it("exchanges a subject token for a narrowed, tier-capped access token", async () => {
    const res = await POST(tokenRequest({ scope: "schedule:read" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      access_token: "signed.access.token",
      issued_token_type: ACCESS_TOKEN_TYPE,
      token_type: "Bearer",
      expires_in: 300,
      scope: "schedule:read",
    });
    expect(signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "user-123",
        aud: AUDIENCE,
        scope: "schedule:read",
        role: "user", // super_admin subject capped by the client's user tier
        azp: client.client_id,
        jti: expect.any(String),
      }),
    );
  });

  it("rejects a request missing a required field", async () => {
    const res = await POST(tokenRequest({}, ["subject_token"]));

    expect(res.status).toBe(400);
    expect((await readError(res)).error).toBe("invalid_request");
  });

  it("rejects unsupported grant types", async () => {
    const res = await POST(tokenRequest({ grant_type: "password" }));

    expect(res.status).toBe(400);
    expect((await readError(res)).error).toBe("unsupported_grant_type");
  });

  it("rejects an unknown client", async () => {
    findClient.mockResolvedValueOnce(null);

    const res = await POST(tokenRequest());

    expect(res.status).toBe(401);
    expect((await readError(res)).error).toBe("invalid_client");
  });

  it("rejects a wrong client secret", async () => {
    const res = await POST(tokenRequest({ client_secret: "nope" }));

    expect(res.status).toBe(401);
    expect((await readError(res)).error).toBe("invalid_client");
  });

  it("rejects an invalid subject token", async () => {
    verifyAccessToken.mockRejectedValueOnce(new Error("bad signature"));

    const res = await POST(tokenRequest());

    expect(res.status).toBe(401);
    expect((await readError(res)).error).toBe("invalid_token");
  });

  it("rejects a denylisted subject token", async () => {
    isJtiDenylisted.mockResolvedValueOnce(true);

    const res = await POST(tokenRequest());

    expect(res.status).toBe(401);
    expect((await readError(res)).error).toBe("invalid_token");
  });

  it("rejects a scope the subject token does not hold", async () => {
    verifyAccessToken.mockResolvedValueOnce({
      ...subjectClaims,
      scope: "schedule:read",
    });

    const res = await POST(tokenRequest({ scope: "notebook:run" }));

    expect(res.status).toBe(400);
    expect((await readError(res)).error).toBe("invalid_scope");
  });

  it("rejects a scope outside the client allow-list", async () => {
    const res = await POST(tokenRequest({ scope: "admin:moderate" }));

    expect(res.status).toBe(400);
    expect((await readError(res)).error).toBe("invalid_scope");
  });

  it("rejects an audience outside the client allow-list", async () => {
    const res = await POST(tokenRequest({ audience: "https://evil.example" }));

    expect(res.status).toBe(400);
    expect((await readError(res)).error).toBe("invalid_target");
  });

  it("records the actor from a valid actor_token", async () => {
    verifyAccessToken
      .mockResolvedValueOnce(subjectClaims)
      .mockResolvedValueOnce({
        sub: "agent-42",
        scope: "schedule:read",
        role: "user",
        jti: "jti-actor",
      });

    const res = await POST(tokenRequest({ actor_token: "actor.jwt" }));

    expect(res.status).toBe(200);
    expect(signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ act: { sub: "agent-42" } }),
    );
  });

  it("rejects an invalid actor_token", async () => {
    verifyAccessToken
      .mockResolvedValueOnce(subjectClaims)
      .mockRejectedValueOnce(new Error("bad signature"));

    const res = await POST(tokenRequest({ actor_token: "actor.jwt" }));

    expect(res.status).toBe(401);
    expect((await readError(res)).error).toBe("invalid_token");
  });
});
