import { exportJWK, importJWK, importPKCS8, jwtVerify, SignJWT } from "jose";
import type { Role } from "@/lib/auth/rbac";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/oauth/policy";

export type AccessTokenClaims = {
  sub: string;
  scope: string;
  role: Role;
  jti: string;
  aud: string;
  azp?: string;
  act?: { sub: string };
};

const ISSUER = process.env.AUTH_URL ?? "http://localhost:3000";

async function privateKey() {
  const raw = process.env.AUTH_TOKEN_PRIVATE_KEY;
  if (!raw) {
    throw new Error("AUTH_TOKEN_PRIVATE_KEY is not set");
  }
  return importPKCS8(raw, "EdDSA");
}

async function publicKey() {
  return importJWK(await exportJWK(await privateKey()), "EdDSA");
}

export async function signAccessToken(
  claims: AccessTokenClaims,
): Promise<string> {
  return new SignJWT({
    scope: claims.scope,
    role: claims.role,
    azp: claims.azp,
    act: claims.act,
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .setSubject(claims.sub)
    .setAudience(claims.aud)
    .setIssuer(ISSUER)
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(await privateKey());
}

/** Verifies signature, issuer and expiry; throws on any failure. */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, await publicKey(), {
    issuer: ISSUER,
  });
  return payload as unknown as AccessTokenClaims;
}
