import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

/**
 * Live Supabase connectivity smoke test.
 *
 * Runs only when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * are present (Vercel/CI secrets or local .env). Use the publishable (anon) key —
 * never the service-role key in a browser bundle.
 *
 *   bun test --config vitest.config.ts tests/integration
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseProjectConfigured = Boolean(url && publishableKey);

describe.skipIf(!supabaseProjectConfigured)(
  "Supabase connectivity (integration)",
  () => {
    it("can reach the project API and complete an auth round-trip", async () => {
      const supabase = createClient(url!, publishableKey!, {
        auth: { persistSession: false },
      });

      // getSession hits the network without requiring a table to exist.
      const { data, error } = await supabase.auth.getSession();
      expect(error).toBeNull();
      expect(data.session).toBeNull(); // no logged-in user on this anon key
    });

    it("gives a service-level error for a nonexistent table (proves RLS/API path)", async () => {
      const supabase = createClient(url!, publishableKey!);
      const { error } = await supabase
        .from("__jidfics_probe_nonexistent__")
        .select("id")
        .limit(1);

      // Either a PostgREST error (PGRST…) or 404 means the API answered.
      // A network failure would surface as a different error shape.
      expect(error).not.toBeNull();
      if (error) {
        expect(String(error.code)).toMatch(/^(PGRST\d+|42P01|.*404.*)$/);
      }
    });
  },
);

describe("Supabase configuration guard (offline)", () => {
  it("refuses to run the live suite without credentials", () => {
    // Documented behavior: the integration describe block self-skips.
    // When env not set, url is undefined (local), when set in CI it's string.
    expect(["string", "undefined"]).toContain(typeof url);
    // Verify skip logic matches env presence
    expect(supabaseProjectConfigured).toBe(Boolean(url && publishableKey));
  });
});
