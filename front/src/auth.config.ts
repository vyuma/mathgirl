import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: store tokens
      if (account) {
        token.idToken = account.id_token!;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        return token;
      }

      // Token still valid (with 5 min buffer)
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000 - 5 * 60 * 1000) {
        return token;
      }

      // Token expired or about to expire — refresh
      if (token.refreshToken) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.AUTH_GOOGLE_ID!,
              client_secret: process.env.AUTH_GOOGLE_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Token refresh failed");
          }

          token.idToken = data.id_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
          if (data.refresh_token) {
            token.refreshToken = data.refresh_token;
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          // Return token as-is; the backend will reject it if truly expired
        }
      }

      return token;
    },
    async session({ token, session }) {
      session.idToken = token.idToken as string;
      return session;
    },
  },
};

export default authConfig;
