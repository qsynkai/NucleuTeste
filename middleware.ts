import { roleAllowsRoute } from "@/lib/auth/permissions";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/calendar",
  "/dashboard",
  "/projects",
  "/admin",
  "/tech-area",
];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isProtected) {
    const access = roleAllowsRoute(session.role, pathname);
    if (!access.allowed) {
      return NextResponse.redirect(
        new URL(access.redirectTo ?? "/dashboard", request.url),
      );
    }
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/calendar/:path*",
    "/dashboard/:path*",
    "/projects/:path*",
    "/admin/:path*",
    "/tech-area/:path*",
  ],
};
