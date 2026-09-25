import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/auth/rbac";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TYPE,
  capTier,
  intersectScopes,
  narrowScope,
  OAuthPolicyError,
  TOKEN_EXCHANGE_GRANT,
  tokenExchangeRequestSchema,
} from "@/lib/oauth/policy";
import {
  type AccessTokenClaims,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/oauth/signer";
import { findClient, isJtiDenylisted } from "@/lib/oauth/store";

function oauthError(status: number, error: string, description: string) {
  return Response.json({ error, error_description: description }, { status });
}

async function tryVerify(token: string): Promise<AccessTokenClaims | null> {
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

function secretMatches(storedHash: string, provided: string): boolean {
  const computed = createHash("sha256").update(provided).digest();
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === computed.length && timingSafeEqual(stored, computed);
}

/**
 * RFC 8693 token exchange. Delegation only narrows: scope ⊆ caller's scope,
 * tier ≤ min(caller tier, client tier), denylisted subjects rejected.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const parsed = tokenExchangeRequestSchema.safeParse(
    Object.fromEntries(form.entries()),
  );
  if (!parsed.success) {
    return oauthError(
      400,
      "invalid_request",
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  const body = parsed.data;
  if (body.grant_type !== TOKEN_EXCHANGE_GRANT) {
    return oauthError(
      400,
      "unsupported_grant_type",
      "only RFC 8693 token exchange is supported",
    );
  }

  const client = await findClient(body.client_id);
  if (!client || !secretMatches(client.secret_hash, body.client_secret)) {
    return oauthError(401, "invalid_client", "client authentication failed");
  }

  const subject = await tryVerify(body.subject_token);
  if (!subject) {
    return oauthError(
      401,
      "invalid_token",
      "subject token is invalid or expired",
    );
  }
  if (await isJtiDenylisted(subject.jti)) {
    return oauthError(401, "invalid_token", "subject token has been revoked");
  }

  let scope: string;
  let role: Role;
  try {
    scope = body.scope
      ? narrowScope(
          client.allowed_scopes.join(" "),
          narrowScope(subject.scope, body.scope),
        )
      : intersectScopes(subject.scope, client.allowed_scopes.join(" "));
    if (!client.allowed_audiences.includes(body.audience)) {
      throw new OAuthPolicyError(
        "invalid_target",
        `audience ${body.audience} is not allowed for this client`,
      );
    }
    role = capTier(subject.role, client.allowed_tier);
  } catch (err) {
    if (err instanceof OAuthPolicyError) {
      return oauthError(400, err.error, err.message);
    }
    throw err;
  }

  let act: { sub: string } | undefined;
  if (body.actor_token) {
    const actor = await tryVerify(body.actor_token);
    if (!actor) {
      return oauthError(
        401,
        "invalid_token",
        "actor token is invalid or expired",
      );
    }
    act = { sub: actor.sub };
  }

  const access_token = await signAccessToken({
    sub: subject.sub,
    aud: body.audience,
    scope,
    role,
    azp: client.client_id,
    jti: randomUUID(),
    act,
  });

  return Response.json({
    access_token,
    issued_token_type: ACCESS_TOKEN_TYPE,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope,
  });
}
