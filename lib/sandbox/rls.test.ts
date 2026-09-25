import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAccessToken } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/oauth/signer", () => ({
  signAccessToken: vi.fn(),
  verifyAccessToken,
}));

import {
  authorizeContainerAccess,
  type RlsDeniedError,
} from "@/lib/sandbox/rls";

const delegationPayload = {
  sub: "user-42",
  scope: "notebook:read notebook:run",
  role: "user",
  use: "delegation",
  jti: "jti-1",
};

const access = {
  token: "subject.jwt",
  requiredScope: "notebook:run",
  resourceOwnerId: "user-42",
};

async function expectDenied(
  input: typeof access,
  code: RlsDeniedError["code"],
): Promise<void> {
  const result = authorizeContainerAccess(input);
  await expect(result).rejects.toMatchObject({ name: "RlsDeniedError", code });
}

describe("authorizeContainerAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verifyAccessToken.mockResolvedValue(delegationPayload);
  });

  it("allows the owner with the required scope", async () => {
    await expect(authorizeContainerAccess(access)).resolves.toMatchObject({
      sub: "user-42",
      use: "delegation",
    });
    expect(verifyAccessToken).toHaveBeenCalledWith("subject.jwt");
  });

  it("denies a different uid (auth.uid() = owner policy)", async () => {
    await expectDenied(
      { ...access, resourceOwnerId: "user-99" },
      "uid_mismatch",
    );
  });

  it("lets an admin role override uid ownership", async () => {
    verifyAccessToken.mockResolvedValue({
      ...delegationPayload,
      role: "super_admin",
    });

    await expect(
      authorizeContainerAccess({ ...access, resourceOwnerId: "user-99" }),
    ).resolves.toMatchObject({ role: "super_admin" });
  });

  it("denies when the required scope is missing", async () => {
    await expectDenied(
      { ...access, requiredScope: "notebook:exec" },
      "missing_scope",
    );
  });

  it("denies an access token that is not a delegation", async () => {
    verifyAccessToken.mockResolvedValue({
      ...delegationPayload,
      use: "access",
    });

    await expectDenied(access, "not_delegation");
  });

  it("denies claims that fail Zod validation", async () => {
    verifyAccessToken.mockResolvedValue({ scope: "notebook:run" });

    await expectDenied(access, "invalid_claims");
  });

  it("denies when token verification fails", async () => {
    verifyAccessToken.mockRejectedValue(new Error("expired"));

    await expectDenied(access, "invalid_claims");
  });
});
