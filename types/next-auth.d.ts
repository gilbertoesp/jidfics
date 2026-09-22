// Type augmentation for Auth.js v5 (NextAuth)
// This file is included via tsconfig.json "include" or "typeRoots"

import type { DefaultJWT } from "@auth/core/jwt";
import type { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User extends DefaultUser {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}
