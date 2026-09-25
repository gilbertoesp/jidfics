import type { Role } from "@/lib/auth/rbac";
import { createServiceClient } from "@/lib/supabase/service";

export type OAuthClient = {
  client_id: string;
  secret_hash: string;
  allowed_scopes: string[];
  allowed_audiences: string[];
  allowed_tier: Role;
};

export async function findClient(
  clientId: string,
): Promise<OAuthClient | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_clients")
    .select(
      "client_id, secret_hash, allowed_scopes, allowed_audiences, allowed_tier",
    )
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    return null; // fail closed: unknown client → invalid_client
  }
  return data ? (data as OAuthClient) : null;
}

export async function isJtiDenylisted(jti: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("token_denylist")
    .select("jti")
    .eq("jti", jti)
    .maybeSingle();
  if (error) {
    return true; // fail closed: revocation status unverifiable → reject
  }
  return Boolean(data);
}
