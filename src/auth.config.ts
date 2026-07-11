import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/env";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  secret: getAuthSecret(),
  trustHost: true,
} satisfies NextAuthConfig;
