import { describe, expect, it } from "vitest";
import { validateEnv } from "./env";

function createMockEnv(
  overrides: Record<string, string> = {},
): Record<string, string | undefined> {
  return {
    AUTH_SECRET: "a".repeat(44), // valid base64-ish 32+ chars
    AUTH_GITHUB_ID: "test-github-id",
    AUTH_GITHUB_SECRET: "test-github-secret",
    AUTH_TRUST_HOST: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    ...overrides,
  };
}

describe("lib/env.ts — environment schema validation", () => {
  it("passes with all valid required vars", () => {
    const env = validateEnv(createMockEnv());
    expect(env.AUTH_SECRET).toBeDefined();
    expect(env.AUTH_GITHUB_ID).toBe("test-github-id");
    expect(env.AUTH_GITHUB_SECRET).toBe("test-github-secret");
    expect(env.AUTH_TRUST_HOST).toBe("true");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("test-anon-key");
    expect(env.AUTH_URL).toBeUndefined();
  });

  it("throws on missing AUTH_SECRET", () => {
    expect(() => validateEnv(createMockEnv({ AUTH_SECRET: "" }))).toThrow(
      "Missing required env vars: AUTH_SECRET",
    );
  });

  it("throws on short AUTH_SECRET (< 32 chars)", () => {
    expect(() => validateEnv(createMockEnv({ AUTH_SECRET: "short" }))).toThrow(
      "Invalid env vars: AUTH_SECRET (must be >= 32 characters)",
    );
  });

  it("throws on missing AUTH_GITHUB_ID", () => {
    expect(() => validateEnv(createMockEnv({ AUTH_GITHUB_ID: "" }))).toThrow(
      "Missing required env vars: AUTH_GITHUB_ID",
    );
  });

  it("throws on missing AUTH_GITHUB_SECRET", () => {
    expect(() =>
      validateEnv(createMockEnv({ AUTH_GITHUB_SECRET: "" })),
    ).toThrow("Missing required env vars: AUTH_GITHUB_SECRET");
  });

  it("throws on invalid AUTH_URL format", () => {
    expect(() => validateEnv(createMockEnv({ AUTH_URL: "not-a-url" }))).toThrow(
      "Invalid env vars: AUTH_URL (must be a valid http(s) URL)",
    );
  });

  it("accepts valid https AUTH_URL", () => {
    const env = validateEnv(createMockEnv({ AUTH_URL: "https://myapp.dev" }));
    expect(env.AUTH_URL).toBe("https://myapp.dev");
  });

  it("accepts valid http AUTH_URL", () => {
    const env = validateEnv(
      createMockEnv({ AUTH_URL: "http://localhost:3000" }),
    );
    expect(env.AUTH_URL).toBe("http://localhost:3000");
  });

  it("throws on invalid AUTH_TRUST_HOST value", () => {
    expect(() =>
      validateEnv(createMockEnv({ AUTH_TRUST_HOST: "maybe" })),
    ).toThrow("Invalid env vars: AUTH_TRUST_HOST (must be 'true' or 'false')");
  });

  it("defaults AUTH_TRUST_HOST to 'true' when absent", () => {
    const env = validateEnv(
      createMockEnv({ AUTH_TRUST_HOST: undefined as unknown as string }),
    );
    expect(env.AUTH_TRUST_HOST).toBe("true");
  });

  it("throws on missing NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(() =>
      validateEnv(createMockEnv({ NEXT_PUBLIC_SUPABASE_URL: "" })),
    ).toThrow("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws on missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", () => {
    expect(() =>
      validateEnv(createMockEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })),
    ).toThrow(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("throws combined errors for multiple missing/invalid vars", () => {
    expect(() =>
      validateEnv(createMockEnv({ AUTH_SECRET: "", AUTH_URL: "bad" })),
    ).toThrow(/Missing required env vars: AUTH_SECRET/);
    expect(() =>
      validateEnv(createMockEnv({ AUTH_SECRET: "", AUTH_URL: "bad" })),
    ).toThrow(/Invalid env vars: AUTH_URL/);
  });
});
