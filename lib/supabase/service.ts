import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side authorization checks (RBAC reads,
 * token denylist, OAuth client registry). The secret key must never reach
 * the browser — server-only usage.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service client is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
