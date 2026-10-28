import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/lib/constants";

/**
 * `?lang=bn` / `?lang=en` links (e.g. shared from a Bangla page): store the choice in the language cookie and
 * redirect to the same URL without the parameter, so the very first render is already in that language.
 */
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang !== "bn" && lang !== "en") return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");
  const res = NextResponse.redirect(url);
  res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  // pages only (never the /api proxy or static files), and only when ?lang= is present
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      has: [{ type: "query", key: "lang" }],
    },
  ],
};
