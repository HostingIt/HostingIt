import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const mfaAllowedPaths = ["/setup-2fa", "/login/2fa"];
const mfaApiPrefix = "/api/auth/2fa";

function isPublicApi(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/github/app/webhook") return true;
  return false;
}

function isMfaAllowedPath(pathname: string): boolean {
  return (
    mfaAllowedPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(mfaApiPrefix) ||
    pathname.startsWith("/api/auth/")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;
  const isApi = pathname.startsWith("/api/");

  if (isApi && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const protectedPaths = ["/dashboard", "/admin"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  const authPages = ["/login", "/signup"];
  const isAuthPage = authPages.includes(pathname);

  if (!isLoggedIn) {
    if (isApi && !isPublicApi(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (session.user?.accountStatus === "suspended") {
    if (isApi) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }
    if (!pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/login?error=suspended", req.url));
    }
    return NextResponse.next();
  }

  const mfaEnrolled = Boolean(session.user.mfaEnrolled);
  const mfaVerified = Boolean(session.user.mfaVerified);

  if (!mfaEnrolled) {
    if (isApi) {
      if (!pathname.startsWith(mfaApiPrefix) && !pathname.startsWith("/api/auth/")) {
        return NextResponse.json(
          { error: "2FA enrollment required", code: "MFA_ENROLL" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }
    if (!pathname.startsWith("/setup-2fa") && !isMfaAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/setup-2fa", req.url));
    }
    return NextResponse.next();
  }

  if (!mfaVerified) {
    if (isApi) {
      if (!pathname.startsWith(mfaApiPrefix) && !pathname.startsWith("/api/auth/")) {
        return NextResponse.json(
          { error: "2FA verification required", code: "MFA_VERIFY" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }
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
    if (isApi) return NextResponse.next();
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    isProtected &&
    session.user.role !== "admin" &&
    pathname.startsWith("/admin")
  ) {
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
    "/api/:path*",
  ],
};
