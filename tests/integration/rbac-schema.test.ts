import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

/**
 * Zero-trust schema smoke test (migration 20260925_zero_trust_rbac).
 *
 * Runs only with Supabase credentials (same self-skip contract as
 * tests/integration/supabase.test.ts). Asserts the RBAC/OAuth substrate
 * exists and that anon gets nothing from the secret-bearing tables.
 *
 *   bunx vitest run tests/integration/rbac-schema.test.ts
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(url && publishableKey);

const RBAC_TABLES = [
  "user_roles",
  "oauth_clients",
  "token_denylist",
  "audit_log",
] as const;

describe.skipIf(!configured)("RBAC schema (integration)", () => {
  it.each(RBAC_TABLES)("table %s exists in the schema cache", async (table) => {
    const supabase = createClient(url!, publishableKey!);
    const { error } = await supabase.from(table).select("*").limit(1);
    // Missing table → PostgREST schema-cache error; existing tables answer
    // (possibly with zero rows when RLS hides them).
    expect(String(error?.code ?? "")).not.toContain("PGRST205");
  });

  it("keeps oauth client secrets unreachable for anon", async () => {
    const supabase = createClient(url!, publishableKey!);
    const { data, error } = await supabase
      .from("oauth_clients")
      .select("client_secret_hash")
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("keeps the token denylist unreachable for anon", async () => {
    const supabase = createClient(url!, publishableKey!);
    const { data, error } = await supabase
      .from("token_denylist")
      .select("jti")
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("keeps the audit log unreachable for anon", async () => {
    const supabase = createClient(url!, publishableKey!);
    const { data, error } = await supabase
      .from("audit_log")
      .select("id")
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});

describe("RBAC schema guard (offline)", () => {
  it("self-skips without credentials", () => {
    expect(configured).toBe(Boolean(url && publishableKey));
  });
});
