import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { legacyTabRedirectPath } from "@/lib/app-routes";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth?.user?.id);
  const { pathname } = req.nextUrl;

  const legacyRedirect = legacyTabRedirectPath(pathname);
  if (legacyRedirect && legacyRedirect !== pathname) {
    return NextResponse.redirect(new URL(legacyRedirect, req.url));
  }

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/investments") ||
    pathname.startsWith("/market") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/calculator") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/finance/:path*",
    "/investments/:path*",
    "/market",
    "/market/:path*",
    "/companies/:path*",
    "/calculator/:path*",
    "/design-system",
    "/admin/:path*",
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
  ],
};
