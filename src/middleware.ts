import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";
import { setSystemLocale } from "./i18n";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 创建国际化中间件
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed"
});

// 导出中间件处理函数
export default async function middleware(request: NextRequest) {
  // 从 URL 中获取语言设置
  const pathname = new URL(request.url).pathname;
  const pathnameLocale = pathname.split("/")[1];
  const locale = locales.includes(pathnameLocale as any) ? pathnameLocale : defaultLocale;

  // 设置系统语言
  setSystemLocale(locale as any);

  // 检查是否是 SSE 路径
  if (request.nextUrl.pathname.startsWith('/api/indexing')) {
    const response = NextResponse.next();
    // 为 SSE 路径设置额外的缓存控制头
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 对于其他路径，使用国际化中间件
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
    "/api/indexing/:path*"
  ]
};
