import { ROLE_RANK, type Role } from "../auth/rbac";

/**
 * RFC 8693 token exchange — pure authorization logic.
 *
 * Deliberately crypto-free: token signature/expiry/denylist verification and
 * signing happen at the route seam (slice 5). This module owns parameter
 * validation and the delegation invariants:
 *   scope issued  ⊆ subject scope ∩ client scope
 *   role issued   ≤ min(subject role, client tier)
 *   act chain     records every actor in the delegation
 */

export const TOKEN_EXCHANGE_GRANT =
  "urn:ietf:params:oauth:grant-type:token-exchange";
export const ACCESS_TOKEN_TYPE =
  "urn:ietf:params:oauth:token-type:access_token";

export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "invalid_target";

export class OAuthError extends Error {
  readonly error: OAuthErrorCode;
  readonly errorDescription: string;
  /** RFC 6749 §5.2 wire fields (snake_case) for the JSON error response. */
  readonly error_description: string;
  readonly status: number;

  constructor(error: OAuthErrorCode, errorDescription: string, status = 400) {
    super(`${error}: ${errorDescription}`);
    this.name = "OAuthError";
    this.error = error;
    this.errorDescription = errorDescription;
    this.error_description = errorDescription;
    this.status = status;
  }
}

export type ParsedTokenExchange = {
  grantType: string;
  subjectToken: string;
  subjectTokenType: string;
  requestedTokenType?: string;
  actorToken?: string;
  audience?: string;
  requestedScopes: string[];
};

function splitScope(scope: string | undefined): string[] {
  if (!scope) {
    return [];
  }
  return scope.split(/\s+/).filter(Boolean);
}

export function parseTokenExchangeRequest(
  params: Record<string, string | undefined>,
): ParsedTokenExchange {
  const grantType = params.grant_type;
  if (!grantType || grantType !== TOKEN_EXCHANGE_GRANT) {
    throw new OAuthError(
      "unsupported_grant_type",
      `Unsupported grant_type: ${String(grantType)}`,
    );
  }

  const subjectToken = params.subject_token;
  if (!subjectToken) {
    throw new OAuthError("invalid_request", "subject_token is required");
  }

  const subjectTokenType = params.subject_token_type;
  if (!subjectTokenType) {
    throw new OAuthError("invalid_request", "subject_token_type is required");
  }
  if (subjectTokenType !== ACCESS_TOKEN_TYPE) {
    throw new OAuthError(
      "invalid_request",
      `Unsupported subject_token_type: ${subjectTokenType}`,
    );
  }

  const requestedTokenType = params.requested_token_type;
  if (requestedTokenType && requestedTokenType !== ACCESS_TOKEN_TYPE) {
    throw new OAuthError(
      "invalid_request",
      `Unsupported requested_token_type: ${requestedTokenType}`,
    );
  }

  return {
    grantType,
    subjectToken,
    subjectTokenType,
    requestedTokenType: requestedTokenType || undefined,
    actorToken: params.actor_token || undefined,
    audience: params.audience || undefined,
    requestedScopes: splitScope(params.scope),
  };
}

export type Actor = { sub: string };

/** Subject facts after signature/expiry/denylist verification (exit seam). */
export type VerifiedSubject = {
  sub: string;
  role: Role;
  scope: string[];
  act?: Actor[];
};

/** OAuth client as registered in the store (exit seam). */
export type RegisteredClient = {
  clientId: string;
  tier: Role;
  allowedScopes: string[];
  allowedAudiences: string[];
};

export type ExchangeInput = {
  subject: VerifiedSubject | null;
  client: RegisteredClient | null;
  requestedScopes: string[];
  actor?: Actor | null;
  audience?: string | null;
};

export type IssuedClaims = {
  sub: string;
  role: Role;
  scope: string;
  aud?: string;
  act?: Actor | Actor[];
};

function capRole(a: Role, b: Role): Role {
  return ROLE_RANK[a] <= ROLE_RANK[b] ? a : b;
}

export function evaluateTokenExchange(input: ExchangeInput): IssuedClaims {
  const { subject, client, requestedScopes } = input;

  if (!client) {
    throw new OAuthError("invalid_client", "Client authentication failed", 401);
  }
  if (!subject) {
    throw new OAuthError(
      "invalid_grant",
      "Subject token is invalid, expired, or revoked",
    );
  }

  for (const scope of requestedScopes) {
    if (
      !subject.scope.includes(scope) ||
      !client.allowedScopes.includes(scope)
    ) {
      throw new OAuthError("invalid_scope", `Scope not allowed: ${scope}`);
    }
  }

  const issuedScope =
    requestedScopes.length > 0
      ? requestedScopes
      : subject.scope.filter((scope) => client.allowedScopes.includes(scope));

  if (input.audience && !client.allowedAudiences.includes(input.audience)) {
    throw new OAuthError(
      "invalid_target",
      `Audience not allowed: ${input.audience}`,
    );
  }

  const claims: IssuedClaims = {
    sub: subject.sub,
    role: capRole(subject.role, client.tier),
    scope: issuedScope.join(" "),
  };

  if (input.audience) {
    claims.aud = input.audience;
  }

  if (input.actor) {
    claims.act =
      subject.act && subject.act.length > 0
        ? [...subject.act, input.actor]
        : input.actor;
  }

  return claims;
}
