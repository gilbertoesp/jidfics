// Type augmentation for Auth.js v5 (NextAuth)
// This file is included via tsconfig.json "include" or "typeRoots"

import type { DefaultJWT } from "@auth/core/jwt";
import type { DefaultUser } from "next-auth";
import type { Role } from "../lib/auth/rbac";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Tiered claim — unset (null/undefined) until the role store ships. */
      role?: Role | null;
    };
  }
  interface User extends DefaultUser {
    id: string;
    role?: Role | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: Role | null;
  }
}
