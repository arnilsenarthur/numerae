import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth?.user?.id);
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify");

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/investments") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/money-map") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/finance", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/finance/:path*",
    "/investments/:path*",
    "/companies/:path*",
    "/money-map/:path*",
    "/calculator",
    "/design-system",
    "/admin/:path*",
    "/login",
    "/register",
    "/verify",
  ],
};
