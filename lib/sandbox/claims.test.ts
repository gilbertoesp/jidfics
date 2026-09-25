import { describe, expect, it } from "vitest";
import { delegationClaimsSchema } from "@/lib/sandbox/claims";

const valid = {
  sub: "user-42",
  scope: "notebook:read notebook:run",
  role: "user",
  use: "delegation",
  jti: "jti-1",
  azp: "notebook-client",
};

function without(key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...valid };
  delete copy[key];
  return copy;
}

describe("delegationClaimsSchema", () => {
  it("accepts valid delegation claims", () => {
    expect(delegationClaimsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unrecognized use value", () => {
    expect(
      delegationClaimsSchema.safeParse({ ...valid, use: "boot" }).success,
    ).toBe(false);
  });

  it("rejects a payload missing sub (no auth.uid source)", () => {
    expect(delegationClaimsSchema.safeParse(without("sub")).success).toBe(
      false,
    );
  });

  it("rejects an unknown role", () => {
    expect(
      delegationClaimsSchema.safeParse({ ...valid, role: "root" }).success,
    ).toBe(false);
  });

  it("rejects a payload missing scope", () => {
    expect(delegationClaimsSchema.safeParse(without("scope")).success).toBe(
      false,
    );
  });

  it("rejects a payload missing jti", () => {
    expect(delegationClaimsSchema.safeParse(without("jti")).success).toBe(
      false,
    );
  });
});
