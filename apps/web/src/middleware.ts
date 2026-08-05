import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const mfaAllowedPaths = ["/setup-2fa", "/login/2fa"];
const mfaApiPrefix = "/api/auth/2fa";

function isMfaAllowedPath(pathname: string): boolean {
  return (
    mfaAllowedPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(mfaApiPrefix) ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/signout")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;

  const protectedPaths = ["/dashboard", "/admin"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  const authPages = ["/login", "/signup"];
  const isAuthPage = authPages.includes(pathname);

  if (!isLoggedIn) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const mfaEnrolled = Boolean(session.user.mfaEnrolled);
  const mfaVerified = Boolean(session.user.mfaVerified);

  if (!mfaEnrolled) {
    if (!pathname.startsWith("/setup-2fa") && !isMfaAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/setup-2fa", req.url));
    }
    return NextResponse.next();
  }

  if (!mfaVerified) {
    if (!pathname.startsWith("/login/2fa") && !isMfaAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/login/2fa", req.url));
    }
    return NextResponse.next();
  }

  if (
    isAuthPage ||
    pathname.startsWith("/setup-2fa") ||
    pathname.startsWith("/login/2fa")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtected && session.user.role !== "admin" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/login/2fa",
    "/signup",
    "/setup-2fa",
  ],
};
