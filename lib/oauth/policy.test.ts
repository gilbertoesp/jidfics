import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_TYPE,
  capTier,
  intersectScopes,
  narrowScope,
  OAuthPolicyError,
  TOKEN_EXCHANGE_GRANT,
  tokenExchangeRequestSchema,
} from "@/lib/oauth/policy";

const validBody = {
  grant_type: TOKEN_EXCHANGE_GRANT,
  client_id: "schedule-agent",
  client_secret: "s3cret-value",
  subject_token: "subject.jwt",
  subject_token_type: ACCESS_TOKEN_TYPE,
  audience: "https://jidfics.vercel.app/api",
};

describe("tokenExchangeRequestSchema", () => {
  it("accepts a minimal token-exchange request", () => {
    expect(tokenExchangeRequestSchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts the optional narrowing params", () => {
    const result = tokenExchangeRequestSchema.safeParse({
      ...validBody,
      requested_token_type: ACCESS_TOKEN_TYPE,
      scope: "schedule:read",
      actor_token: "actor.jwt",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a request missing subject_token_type", () => {
    const missing: Record<string, string> = { ...validBody };
    delete missing.subject_token_type;
    expect(tokenExchangeRequestSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects a request missing the audience", () => {
    const missing: Record<string, string> = { ...validBody };
    delete missing.audience;
    expect(tokenExchangeRequestSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects an unsupported subject_token_type", () => {
    const result = tokenExchangeRequestSchema.safeParse({
      ...validBody,
      subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported requested_token_type", () => {
    const result = tokenExchangeRequestSchema.safeParse({
      ...validBody,
      requested_token_type: "urn:ietf:params:oauth:token-type:jwt",
    });
    expect(result.success).toBe(false);
  });
});

describe("narrowScope", () => {
  it("returns the allowed scope when no scope is requested", () => {
    expect(narrowScope("schedule:read notebook:run")).toBe(
      "schedule:read notebook:run",
    );
  });

  it("returns a subset request in requested order", () => {
    expect(
      narrowScope("schedule:read notebook:run", "notebook:run schedule:read"),
    ).toBe("notebook:run schedule:read");
  });

  it("throws invalid_scope when the request exceeds the allowed scope", () => {
    expect(() =>
      narrowScope("schedule:read", "schedule:read notebook:run"),
    ).toThrowError(OAuthPolicyError);

    let caught: unknown;
    try {
      narrowScope("schedule:read", "notebook:run");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(OAuthPolicyError);
    expect((caught as OAuthPolicyError).error).toBe("invalid_scope");
  });
});

describe("intersectScopes", () => {
  it("keeps shared scopes in first-argument order", () => {
    expect(
      intersectScopes(
        "schedule:read notebook:run admin:moderate",
        "notebook:run schedule:read",
      ),
    ).toBe("schedule:read notebook:run");
  });

  it("returns an empty string when nothing overlaps", () => {
    expect(intersectScopes("admin:moderate", "schedule:read")).toBe("");
  });
});

describe("capTier", () => {
  it("caps a super_admin subject to the client's user tier", () => {
    expect(capTier("super_admin", "user")).toBe("user");
  });

  it("never elevates a user subject above their own tier", () => {
    expect(capTier("user", "super_admin")).toBe("user");
  });

  it("keeps the subject tier when the client allows at least as much", () => {
    expect(capTier("admin", "super_admin")).toBe("admin");
    expect(capTier("admin", "admin")).toBe("admin");
  });
});
