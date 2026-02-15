import NextAuth, { type NextAuthConfig, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// 認証APIのベースパス
export const BASE_PATH = "/api/auth";

import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
