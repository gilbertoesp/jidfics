import { jwtVerify } from "jose";

/**
 * Verifies a primary Supabase JWT (HS256, project JWT secret) and returns
 * the raw payload — claim parsing happens at the Zod boundary in
 * `lib/oauth/claims.ts`, not here.
 */
export async function verifyPrimaryJwt(token: string): Promise<unknown> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is not set");
  }
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ["HS256"],
  });
  return payload;
}
