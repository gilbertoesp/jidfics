import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/auth/rbac";
import {
  denylistId,
  highestRole,
  primaryIdentitySchema,
  primaryScope,
} from "@/lib/oauth/claims";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TYPE,
  ACCESS_TOKEN_USE,
  capTier,
  DELEGATION_TOKEN_TYPE,
  DELEGATION_TTL_SECONDS,
  DELEGATION_USE,
  intersectScopes,
  narrowScope,
  OAuthPolicyError,
  PRIMARY_SUBJECT_TYPE,
  TOKEN_EXCHANGE_GRANT,
  tokenExchangeRequestSchema,
} from "@/lib/oauth/policy";
import { verifyPrimaryJwt } from "@/lib/oauth/primary";
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

async function tryVerifyPrimary(token: string): Promise<unknown | null> {
  try {
    return await verifyPrimaryJwt(token);
  } catch {
    return null;
  }
}

type ExchangeSubject = {
  sub: string;
  scope: string;
  role: Role;
  jti?: string;
};

function secretMatches(storedHash: string, provided: string): boolean {
  const computed = createHash("sha256").update(provided).digest();
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === computed.length && timingSafeEqual(stored, computed);
}

/**
 * RFC 8693 token exchange. Delegation only narrows: scope ⊆ caller's scope,
 * tier ≤ min(caller tier, client tier), denylisted subjects rejected.
 * Subject may be an already-minted access token or a primary Supabase JWT
 * (`urn:jidfics:token-type:primary` → Zod-parsed `app_metadata.roles` /
 * `authorization.scopes`); `requested_token_type=delegation` mints a 60s
 * downscoped token for the AI agent tool loop.
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

  let subject: ExchangeSubject;
  if (body.subject_token_type === PRIMARY_SUBJECT_TYPE) {
    const payload = await tryVerifyPrimary(body.subject_token);
    if (!payload) {
      return oauthError(
        401,
        "invalid_token",
        "primary token is invalid or expired",
      );
    }
    const identity = primaryIdentitySchema.safeParse(payload);
    if (!identity.success) {
      return oauthError(
        401,
        "invalid_token",
        `primary claims invalid: ${identity.error.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }
    subject = {
      sub: identity.data.sub,
      scope: primaryScope(identity.data),
      role: highestRole(identity.data.app_metadata.roles),
      jti: denylistId(identity.data),
    };
  } else {
    const token = await tryVerify(body.subject_token);
    if (!token) {
      return oauthError(
        401,
        "invalid_token",
        "subject token is invalid or expired",
      );
    }
    subject = token;
  }
  if (subject.jti && (await isJtiDenylisted(subject.jti))) {
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

  const isDelegation = body.requested_token_type === DELEGATION_TOKEN_TYPE;
  const expires_in = isDelegation
    ? DELEGATION_TTL_SECONDS
    : ACCESS_TOKEN_TTL_SECONDS;

  const access_token = await signAccessToken(
    {
      sub: subject.sub,
      aud: body.audience,
      scope,
      role,
      azp: client.client_id,
      jti: randomUUID(),
      act,
      use: isDelegation ? DELEGATION_USE : ACCESS_TOKEN_USE,
    },
    expires_in,
  );

  return Response.json({
    access_token,
    issued_token_type: isDelegation ? DELEGATION_TOKEN_TYPE : ACCESS_TOKEN_TYPE,
    token_type: "Bearer",
    expires_in,
    scope,
  });
}
