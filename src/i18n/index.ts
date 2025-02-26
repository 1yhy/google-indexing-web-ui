import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "./config";

// 用于客户端导航
export const { Link, usePathname, useRouter } = createSharedPathnamesNavigation({ locales });

// 导出所有配置和工具
export * from "./config";
export * from "./server";
export * from "./client";

// 重新导出类型
export type { MessageKeys } from "./server/translator";
export type { Translator, TranslatorOptions } from "./server/types";
