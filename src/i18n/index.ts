import { createSharedPathnamesNavigation } from "next-intl/navigation";

// 支持的语言列表
export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale = "en";

// 用于客户端导航
export const { Link, usePathname, useRouter } = createSharedPathnamesNavigation({ locales });

// 全局配置
export const timeZone = "Asia/Shanghai";

// 日期时间格式配置
export const dateTimeFormats = {
  full: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  },
} as const;
