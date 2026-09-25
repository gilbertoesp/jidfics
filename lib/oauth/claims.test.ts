import { describe, expect, it } from "vitest";
import {
  denylistId,
  highestRole,
  primaryIdentitySchema,
  primaryScope,
} from "@/lib/oauth/claims";

const valid = {
  sub: "user-42",
  app_metadata: { roles: ["user", "admin"] },
  authorization: { scopes: ["schedule:read", "notebook:run"] },
  jti: "jti-1",
};

function without(...keys: string[]): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...valid };
  for (const key of keys) {
    delete copy[key];
  }
  return copy;
}

describe("primaryIdentitySchema", () => {
  it("accepts a valid primary JWT payload", () => {
    expect(primaryIdentitySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unrecognized role value", () => {
    const result = primaryIdentitySchema.safeParse({
      ...valid,
      app_metadata: { roles: ["root"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty roles array", () => {
    const result = primaryIdentitySchema.safeParse({
      ...valid,
      app_metadata: { roles: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload missing app_metadata", () => {
    expect(
      primaryIdentitySchema.safeParse(without("app_metadata")).success,
    ).toBe(false);
  });
});

describe("highestRole", () => {
  it("picks the highest rank regardless of order", () => {
    expect(highestRole(["admin", "user"])).toBe("admin");
    expect(highestRole(["user", "super_admin", "admin"])).toBe("super_admin");
    expect(highestRole(["user"])).toBe("user");
  });
});

describe("primaryScope", () => {
  it("joins authorization.scopes into a space-delimited scope", () => {
    expect(primaryScope(primaryIdentitySchema.parse(valid))).toBe(
      "schedule:read notebook:run",
    );
  });

  it("returns an empty string when authorization is absent", () => {
    expect(
      primaryScope(primaryIdentitySchema.parse(without("authorization"))),
    ).toBe("");
  });
});

describe("denylistId", () => {
  it("prefers jti when present", () => {
    const identity = primaryIdentitySchema.parse({
      ...valid,
      session_id: "session-9",
    });
    expect(denylistId(identity)).toBe("jti-1");
  });

  it("falls back to session_id", () => {
    const identity = primaryIdentitySchema.parse({
      ...without("jti"),
      session_id: "session-9",
    });
    expect(denylistId(identity)).toBe("session-9");
  });

  it("is undefined when neither identifier exists", () => {
    expect(
      denylistId(primaryIdentitySchema.parse(without("jti"))),
    ).toBeUndefined();
  });
});
