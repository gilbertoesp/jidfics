import { describe, expect, it } from "vitest";
import {
  type ExchangeInput,
  evaluateTokenExchange,
  OAuthError,
  parseTokenExchangeRequest,
} from "./exchange";

const TOKEN_EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange";
const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";

function caught(fn: () => void): unknown {
  try {
    fn();
    return undefined;
  } catch (err) {
    return err;
  }
}

function oauthError(fn: () => unknown): OAuthError {
  const err = caught(() => {
    fn();
    return undefined;
  });
  expect(err).toBeInstanceOf(OAuthError);
  return err as OAuthError;
}

describe("lib/oauth/exchange.ts — RFC 8693 token exchange", () => {
  describe("parseTokenExchangeRequest", () => {
    it("parses a well-formed token-exchange request", () => {
      const parsed = parseTokenExchangeRequest({
        grant_type: TOKEN_EXCHANGE,
        subject_token: "subj-token",
        subject_token_type: ACCESS_TOKEN_TYPE,
        requested_token_type: ACCESS_TOKEN_TYPE,
        actor_token: "actor-token",
        audience: "https://api.example.com",
        scope: "schedule:read notebook:run",
      });
      expect(parsed).toEqual({
        grantType: TOKEN_EXCHANGE,
        subjectToken: "subj-token",
        subjectTokenType: ACCESS_TOKEN_TYPE,
        requestedTokenType: ACCESS_TOKEN_TYPE,
        actorToken: "actor-token",
        audience: "https://api.example.com",
        requestedScopes: ["schedule:read", "notebook:run"],
      });
    });

    it("treats scope as optional (empty list = ask for everything allowed)", () => {
      const parsed = parseTokenExchangeRequest({
        grant_type: TOKEN_EXCHANGE,
        subject_token: "subj-token",
        subject_token_type: ACCESS_TOKEN_TYPE,
      });
      expect(parsed.requestedScopes).toEqual([]);
      expect(parsed.requestedTokenType).toBeUndefined();
      expect(parsed.actorToken).toBeUndefined();
    });

    it("splits scope on arbitrary whitespace runs", () => {
      const parsed = parseTokenExchangeRequest({
        grant_type: TOKEN_EXCHANGE,
        subject_token: "s",
        subject_token_type: ACCESS_TOKEN_TYPE,
        scope: "  a:read   b:write\tc:admin ",
      });
      expect(parsed.requestedScopes).toEqual(["a:read", "b:write", "c:admin"]);
    });

    it("rejects a missing or foreign grant_type with unsupported_grant_type", () => {
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            subject_token: "s",
            subject_token_type: ACCESS_TOKEN_TYPE,
          }),
        ).error,
      ).toBe("unsupported_grant_type");
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            grant_type: "authorization_code",
            subject_token: "s",
            subject_token_type: ACCESS_TOKEN_TYPE,
          }),
        ).error,
      ).toBe("unsupported_grant_type");
    });

    it("rejects a missing subject_token with invalid_request", () => {
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            grant_type: TOKEN_EXCHANGE,
            subject_token_type: ACCESS_TOKEN_TYPE,
          }),
        ).error,
      ).toBe("invalid_request");
    });

    it("rejects a missing subject_token_type with invalid_request", () => {
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            grant_type: TOKEN_EXCHANGE,
            subject_token: "s",
          }),
        ).error,
      ).toBe("invalid_request");
    });

    it("rejects unsupported subject/requested token types", () => {
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            grant_type: TOKEN_EXCHANGE,
            subject_token: "s",
            subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
          }),
        ).error,
      ).toBe("invalid_request");
      expect(
        oauthError(() =>
          parseTokenExchangeRequest({
            grant_type: TOKEN_EXCHANGE,
            subject_token: "s",
            subject_token_type: ACCESS_TOKEN_TYPE,
            requested_token_type:
              "urn:ietf:params:oauth:token-type:refresh_token",
          }),
        ).error,
      ).toBe("invalid_request");
    });
  });

  describe("evaluateTokenExchange", () => {
    const client = {
      clientId: "schedule-agent",
      tier: "user" as const,
      allowedScopes: ["schedule:read", "notebook:run"],
      allowedAudiences: ["https://api.example.com"],
    };

    const subject = {
      sub: "user-42",
      role: "admin" as const,
      scope: ["schedule:read", "notebook:run", "admin:moderate"],
    };

    it("issues the subject's full allowed scope when none is requested", () => {
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: [],
      });
      expect(claims.sub).toBe("user-42");
      expect(claims.scope).toBe("schedule:read notebook:run");
      // subject is admin, but the registered client is tier=user → capped
      expect(claims.role).toBe("user");
    });

    it("grants explicitly requested scopes the subject holds", () => {
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: ["notebook:run"],
      });
      expect(claims.scope).toBe("notebook:run");
    });

    it("refuses to widen scope beyond what the subject holds (invalid_scope)", () => {
      const err = oauthError(() =>
        evaluateTokenExchange({
          subject,
          client,
          requestedScopes: ["schedule:read", "admin:delete"],
        }),
      );
      expect(err.error).toBe("invalid_scope");
    });

    it("refuses scopes the client is not allowed to hold (invalid_scope)", () => {
      const err = oauthError(() =>
        evaluateTokenExchange({
          subject,
          client,
          requestedScopes: ["admin:moderate"],
        }),
      );
      expect(err.error).toBe("invalid_scope");
    });

    it("rejects an unverified subject token with invalid_grant", () => {
      expect(
        oauthError(() =>
          evaluateTokenExchange({
            subject: null,
            client,
            requestedScopes: [],
          }),
        ).error,
      ).toBe("invalid_grant");
    });

    it("rejects an unknown client with invalid_client", () => {
      expect(
        oauthError(() =>
          evaluateTokenExchange({
            subject,
            client: null,
            requestedScopes: [],
          }),
        ).error,
      ).toBe("invalid_client");
    });

    it("rejects an audience the client may not target (invalid_target)", () => {
      expect(
        oauthError(() =>
          evaluateTokenExchange({
            subject,
            client,
            requestedScopes: [],
            audience: "https://evil.example.com",
          }),
        ).error,
      ).toBe("invalid_target");
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: [],
        audience: "https://api.example.com",
      });
      expect(claims.aud).toBe("https://api.example.com");
    });

    it("caps the issued role at the client tier", () => {
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: [],
      });
      expect(claims.role).toBe("user");
    });

    it("preserves the subject tier when the client tier is higher", () => {
      const privilegedClient = {
        clientId: "admin-agent",
        tier: "super_admin" as const,
        allowedScopes: ["schedule:read", "notebook:run", "admin:moderate"],
        allowedAudiences: ["https://api.example.com"],
      };
      const claims = evaluateTokenExchange({
        subject,
        client: privilegedClient,
        requestedScopes: [],
      });
      expect(claims.role).toBe("admin");
      expect(claims.scope).toBe("schedule:read notebook:run admin:moderate");
    });

    it("never elevates the issued role above the subject role", () => {
      const lowSubject = {
        sub: "user-7",
        role: "user" as const,
        scope: ["schedule:read"],
      };
      const privilegedClient = {
        ...client,
        tier: "super_admin" as const,
      };
      const claims = evaluateTokenExchange({
        subject: lowSubject,
        client: privilegedClient,
        requestedScopes: [],
      });
      expect(claims.role).toBe("user");
    });

    it("omits act when no actor token is presented", () => {
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: [],
      });
      expect(claims.act).toBeUndefined();
    });

    it("records the actor as a single-entry act claim on first delegation", () => {
      const claims = evaluateTokenExchange({
        subject,
        client,
        requestedScopes: [],
        actor: { sub: "agent-1" },
      });
      expect(claims.act).toEqual({ sub: "agent-1" });
    });

    it("appends to the actor chain on nested delegation", () => {
      const chainedSubject = {
        ...subject,
        act: [{ sub: "agent-1" }, { sub: "agent-2" }],
      };
      const claims = evaluateTokenExchange({
        subject: chainedSubject,
        client,
        requestedScopes: [],
        actor: { sub: "agent-3" },
      });
      expect(claims.act).toEqual([
        { sub: "agent-1" },
        { sub: "agent-2" },
        { sub: "agent-3" },
      ]);
    });

    it("caps a chained subject at the client tier too", () => {
      const superAdminSubject = {
        sub: "root-1",
        role: "super_admin" as const,
        scope: ["schedule:read"],
      };
      const claims = evaluateTokenExchange({
        subject: superAdminSubject,
        client,
        requestedScopes: [],
      });
      expect(claims.role).toBe("user");
    });
  });

  describe("error responses", () => {
    it("carries RFC 6749 status codes", () => {
      const invalidClient = oauthError(() =>
        evaluateTokenExchange({
          subject: {
            sub: "u",
            role: "user",
            scope: [],
          },
          client: null,
          requestedScopes: [],
        }),
      );
      expect(invalidClient.status).toBe(401);

      const invalidScope = oauthError(() =>
        evaluateTokenExchange({
          subject: {
            sub: "u",
            role: "user",
            scope: [],
          },
          client: {
            clientId: "c",
            tier: "user",
            allowedScopes: [],
            allowedAudiences: [],
          },
          requestedScopes: ["nope:read"],
        }),
      );
      expect(invalidScope.status).toBe(400);
    });

    it("exposes error and error_description fields for the token response", () => {
      const err = oauthError(() =>
        parseTokenExchangeRequest({ grant_type: "nope" }),
      );
      expect(err.error).toBe("unsupported_grant_type");
      expect(typeof err.errorDescription).toBe("string");
      expect((err as unknown as Record<string, string>).error_description).toBe(
        err.errorDescription,
      );
    });
  });

  describe("type contract", () => {
    it("keeps evaluateTokenExchange input assignable (compile-time seam)", () => {
      const input: ExchangeInput = {
        subject: null,
        client: null,
        requestedScopes: [],
        actor: null,
        audience: null,
      };
      expect(() => evaluateTokenExchange(input)).toThrow(OAuthError);
    });
  });
});
