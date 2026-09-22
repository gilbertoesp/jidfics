/**
 * Environment variable schema validation for Auth.js v5.
 * Fail-fast, typed, server-only. No zod dependency.
 */

type EnvSchema = {
  // Auth.js v5 required
  AUTH_SECRET: string;
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  // Optional
  AUTH_URL?: string;
  AUTH_TRUST_HOST?: "true" | "false";
  // Supabase (pass-through, validated elsewhere)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};

const REQUIRED_KEYS = [
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
] as const;
const SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

function validateEnv(raw: Record<string, string | undefined>): EnvSchema {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Required presence
  for (const key of REQUIRED_KEYS) {
    const val = raw[key];
    if (!val || val.trim() === "") {
      missing.push(key);
    }
  }

  // AUTH_SECRET minimum length
  const secret = raw.AUTH_SECRET;
  if (secret && secret.length < 32) {
    invalid.push("AUTH_SECRET (must be >= 32 characters)");
  }

  // AUTH_URL format if present
  const url = raw.AUTH_URL;
  if (url && url.trim() !== "" && !/^https?:\/\/.+/.test(url)) {
    invalid.push("AUTH_URL (must be a valid http(s) URL)");
  }

  // AUTH_TRUST_HOST boolean if present
  const trustHost = raw.AUTH_TRUST_HOST;
  if (
    trustHost !== undefined &&
    trustHost !== "true" &&
    trustHost !== "false"
  ) {
    invalid.push("AUTH_TRUST_HOST (must be 'true' or 'false')");
  }

  // Supabase presence (existing requirement)
  for (const key of SUPABASE_KEYS) {
    if (!raw[key] || raw[key]!.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    const msg = [
      missing.length > 0
        ? `Missing required env vars: ${missing.join(", ")}`
        : null,
      invalid.length > 0 ? `Invalid env vars: ${invalid.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`Environment validation failed: ${msg}`);
  }

  // Build typed object (all present guaranteed)
  const env: EnvSchema = {
    AUTH_SECRET: raw.AUTH_SECRET!,
    AUTH_GITHUB_ID: raw.AUTH_GITHUB_ID!,
    AUTH_GITHUB_SECRET: raw.AUTH_GITHUB_SECRET!,
    AUTH_URL: raw.AUTH_URL?.trim() || undefined,
    AUTH_TRUST_HOST: (raw.AUTH_TRUST_HOST as "true" | "false") || "true",
    NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };

  return env;
}

// Export validation function for testing
export { type EnvSchema, validateEnv };

// Lazy singleton — evaluated on first access, server-only
let _env: EnvSchema | null = null;

function getEnv(): EnvSchema {
  if (typeof window !== "undefined") {
    throw new Error("lib/env.ts must not be imported in client code");
  }
  if (!_env) {
    _env = validateEnv(process.env as Record<string, string | undefined>);
  }
  return _env;
}

export const env = new Proxy({} as EnvSchema, {
  get(_target, prop) {
    return getEnv()[prop as keyof EnvSchema];
  },
}) as EnvSchema;
