import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Define public routes that don't need authentication
const publicRoutes = ["/login", "/register", "/api/auth", "/nfc/login", "/guest", "/products"];

export default auth((req) => {
  const needsAuth = !publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  const isLoggedIn = !!req.auth;
  const isGuest = req.cookies.has("guest_session");

  if (needsAuth && !isLoggedIn && !isGuest) {
     return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  
  if (isLoggedIn && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register")) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Guest restriction: Guests cannot access main app routes (like /)
  // They can only access /guest*, /upload-memory, and maybe some shared public resources if any.
  // We already defined publicRoutes, but guests are special "authenticated" users that have restricted access.
  if (isGuest && !req.nextUrl.pathname.startsWith("/guest") && !req.nextUrl.pathname.startsWith("/upload-memory")) {
       return NextResponse.redirect(new URL("/guest/memories", req.nextUrl));
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
