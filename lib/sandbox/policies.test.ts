import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAccessToken } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/oauth/signer", () => ({
  signAccessToken: vi.fn(),
  verifyAccessToken,
}));

import {
  authorizeDataAccess,
  SANDBOX_POLICIES,
  sandboxPolicySchema,
} from "@/lib/sandbox/policies";
import type { RlsDeniedError } from "@/lib/sandbox/rls";

const delegationPayload = {
  sub: "user-42",
  scope: "notebook:read notebook:write schedule:read",
  role: "user",
  use: "delegation",
  jti: "jti-1",
};

const ownerRead = {
  token: "subject.jwt",
  table: "notebooks",
  action: "read",
  rowOwnerId: "user-42",
};

async function expectDenied(
  input: typeof ownerRead,
  code: RlsDeniedError["code"],
): Promise<void> {
  const result = authorizeDataAccess(input);
  await expect(result).rejects.toMatchObject({ name: "RlsDeniedError", code });
}

describe("sandboxPolicySchema", () => {
  it("accepts the real sandbox policy registry", () => {
    expect(sandboxPolicySchema.safeParse(SANDBOX_POLICIES).success).toBe(true);
  });

  it("rejects an action policy with an empty scope", () => {
    const result = sandboxPolicySchema.safeParse({
      notebooks: { read: { scope: "", ownership: "owner" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown ownership mode", () => {
    const result = sandboxPolicySchema.safeParse({
      notebooks: { read: { scope: "notebook:read", ownership: "shared" } },
    });
    expect(result.success).toBe(false);
  });
});

describe("authorizeDataAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verifyAccessToken.mockResolvedValue(delegationPayload);
  });

  it("allows the owner with the required scope", async () => {
    await expect(authorizeDataAccess(ownerRead)).resolves.toMatchObject({
      sub: "user-42",
      use: "delegation",
    });
    expect(verifyAccessToken).toHaveBeenCalledWith("subject.jwt");
  });

  it("denies a foreign uid in owner mode", async () => {
    await expectDenied({ ...ownerRead, rowOwnerId: "user-99" }, "uid_mismatch");
  });

  it("lets an admin role override ownership", async () => {
    verifyAccessToken.mockResolvedValue({
      ...delegationPayload,
      role: "super_admin",
    });

    await expect(
      authorizeDataAccess({ ...ownerRead, rowOwnerId: "user-99" }),
    ).resolves.toMatchObject({ role: "super_admin" });
  });

  it("allows a foreign uid when ownership is none", async () => {
    await expect(
      authorizeDataAccess({
        token: "subject.jwt",
        table: "schedule",
        action: "read",
        rowOwnerId: "user-99",
      }),
    ).resolves.toMatchObject({ sub: "user-42" });
  });

  it("denies when the delegation scope does not cover the action", async () => {
    verifyAccessToken.mockResolvedValue({
      ...delegationPayload,
      scope: "schedule:read",
    });

    await expectDenied(ownerRead, "missing_scope");
  });

  it("denies a table absent from the registry", async () => {
    await expectDenied({ ...ownerRead, table: "secrets" }, "unknown_resource");
  });

  it("denies an action absent from the registry", async () => {
    await expectDenied({ ...ownerRead, action: "delete" }, "unknown_resource");
  });

  it("denies when token verification fails", async () => {
    verifyAccessToken.mockRejectedValue(new Error("expired"));

    await expectDenied(ownerRead, "invalid_claims");
  });

  it("denies an access token that is not a delegation", async () => {
    verifyAccessToken.mockResolvedValue({
      ...delegationPayload,
      use: "access",
    });

    await expectDenied(ownerRead, "not_delegation");
  });
});
