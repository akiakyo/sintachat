import { NextRequest, NextResponse } from "next/server";

const CONSENT_COOKIE = "sintachat_consent_session";
const PUBLIC_PATHS = new Set(["/", "/terms", "/safety", "/privacy", "/faq", "/about", "/admin"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/consent") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (!request.cookies.get(CONSENT_COOKIE)?.value) {
    const consentUrl = request.nextUrl.clone();
    consentUrl.pathname = "/";
    consentUrl.search = "";
    return NextResponse.redirect(consentUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico|robots.txt|sitemap.xml).*)"]
};
