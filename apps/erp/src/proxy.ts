import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth/token";

const PUBLIC_PREFIXES = ["/login", "/_next/", "/media/"];
const PUBLIC_FILES = new Set(["/favicon.ico", "/icon.png", "/icon.svg", "/apple-icon.png"]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_FILES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
  );
}

/**
 * Optimistic gate only: it checks that a session cookie exists, never that it is valid. The real
 * check is `requireSession()` in the ERP layout and in every Server Action (Server Actions are
 * POSTs to the page route, so this redirect alone must never be relied on).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|favicon.ico|icon\\.|apple-icon\\.).*)"],
};
