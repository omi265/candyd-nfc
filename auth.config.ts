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
        session.user.contact = token.contact as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role || "USER";
        token.contact = user.contact;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.contact !== undefined) token.contact = session.user.contact;
      }
      return token;
    },
  },
  providers: [], // Providers added in auth.ts
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig;
