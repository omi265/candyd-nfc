import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = ["/login", "/register", "/api/auth", "/nfc/login"].some(route => 
        nextUrl.pathname.startsWith(route)
      );

      if (!isPublicRoute && !isLoggedIn) {
        return false; // Redirect to login
      }

      return true; 
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role || "USER";
      }
      return token;
    },
  },
  providers: [], // Providers added in auth.ts
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
