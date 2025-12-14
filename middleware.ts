import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Define public routes that don't need authentication
const publicRoutes = ["/login", "/register", "/api/auth", "/nfc/login"];

export default auth((req) => {
  const needsAuth = !publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  const isLoggedIn = !!req.auth;

  if (needsAuth && !isLoggedIn) {
     return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  
  if (isLoggedIn && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register")) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
      /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$).*)",
  ],
};
