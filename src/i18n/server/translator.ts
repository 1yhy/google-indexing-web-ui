import { createTranslator as createNextIntlTranslator } from "next-intl";
import { defaultLocale, Locale, namespaces, Namespace } from "../config";
import type { TranslatorOptions, Translator } from "./types";
import zhMessages from "@/messages/zh.json";
import enMessages from "@/messages/en.json";

// 支持的语言消息映射
const messages = {
  zh: zhMessages,
  en: enMessages,
} as const;

// 从消息文件中提取所有可能的键
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: T[K] extends object ? `${K & string}.${NestedKeyOf<T[K]> & string}` : K }[keyof T]
  : never;

export type MessageKeys = NestedKeyOf<typeof zhMessages>;

// 翻译器缓存
const translatorCache = new Map<string, Translator>();

// 获取缓存键
const getCacheKey = (locale: string, namespace?: string) => `${locale}:${namespace || 'default'}`;

/**
 * 创建翻译器实例
 */
export function createTranslator(options: TranslatorOptions = {}): Translator {
  const { locale = defaultLocale, namespace } = options;
  const finalLocale = (locale in messages) ? locale as Locale : defaultLocale;

  // 检查缓存
  const cacheKey = getCacheKey(finalLocale, namespace);
  const cachedTranslator = translatorCache.get(cacheKey);
  if (cachedTranslator) {
    return cachedTranslator;
  }

  const translator = createNextIntlTranslator({
    messages: messages[finalLocale],
    locale: finalLocale,
    // 允许动态键名
    onError: (error) => {
      console.warn(`Translation warning for locale ${finalLocale}:`, error);
      return options.fallback || '';
    }
  });

  const wrappedTranslator: Translator = {
    t: (key: string, params?: Record<string, any>) => {
      try {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        const result = translator(fullKey, params);
        if (!result && process.env.NODE_ENV === 'development') {
          console.warn(`Missing translation for key: ${fullKey} in locale: ${finalLocale}`);
        }
        return result || options.fallback || key;
      } catch (error) {
        console.error(`Translation error for key: ${key} in locale: ${finalLocale}`, error);
        return options.fallback || key;
      }
    },
    locale: finalLocale,
    namespace
  };

  // 缓存翻译器实例
  translatorCache.set(cacheKey, wrappedTranslator);

  return wrappedTranslator;
}

/**
 * 创建特定领域的翻译器
 */
export function createDomainTranslator(namespace: Namespace) {
  return (locale: Locale = defaultLocale) => createTranslator({ locale, namespace });
}

/**
 * 预定义的领域翻译器
 */
export const translators = Object.entries(namespaces).reduce((acc, [key, value]) => ({
  ...acc,
  [key]: createDomainTranslator(key as Namespace)
}), {} as Record<Namespace, ReturnType<typeof createDomainTranslator>>);

/**
 * 清除翻译器缓存
 */
export function clearTranslatorCache() {
  translatorCache.clear();
}
