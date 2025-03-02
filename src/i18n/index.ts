import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "./config";

// navigation for client
export const { Link, usePathname, useRouter } = createSharedPathnamesNavigation({ locales });

// export all configurations and tools
export * from "./config";
export * from "./server";
export * from "./client";

// re-export types
export type { MessageKeys } from "./server/translator";
export type { Translator, TranslatorOptions } from "./server/types";
