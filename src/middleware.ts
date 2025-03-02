import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";
import { setSystemLocale } from "./i18n";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create internationalization middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed"
});

// Export middleware handler
export default async function middleware(request: NextRequest) {
  // Get language setting from URL
  const pathname = new URL(request.url).pathname;
  const pathnameLocale = pathname.split("/")[1];
  const locale = locales.includes(pathnameLocale as any) ? pathnameLocale : defaultLocale;

  // Set system language
  setSystemLocale(locale as any);

  // Check if it's SSE path
  if (request.nextUrl.pathname.startsWith('/api/indexing')) {
    const response = NextResponse.next();
    // Set additional cache control headers for SSE path
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // For other paths, use internationalization middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
    "/api/indexing/:path*"
  ]
};
