import { createTranslator as createNextIntlTranslator } from "next-intl";
import { defaultLocale, Locale, namespaces, Namespace } from "../config";
import type { TranslatorOptions, Translator } from "./types";
import zhMessages from "@/messages/zh.json";
import enMessages from "@/messages/en.json";

// supported language message mapping
const messages = {
  zh: zhMessages,
  en: enMessages,
} as const;

// extract all possible keys from message files
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: T[K] extends object ? `${K & string}.${NestedKeyOf<T[K]> & string}` : K }[keyof T]
  : never;

export type MessageKeys = NestedKeyOf<typeof zhMessages>;

// translator cache
const translatorCache = new Map<string, Translator>();

// get cache key
const getCacheKey = (locale: string, namespace?: string) => `${locale}:${namespace || 'default'}`;

/**
 * create translator instance
 */
export function createTranslator(options: TranslatorOptions = {}): Translator {
  const { locale = defaultLocale, namespace } = options;
  const finalLocale = (locale in messages) ? locale as Locale : defaultLocale;

  // check cache
  const cacheKey = getCacheKey(finalLocale, namespace);
  const cachedTranslator = translatorCache.get(cacheKey);
  if (cachedTranslator) {
    return cachedTranslator;
  }

  const translator = createNextIntlTranslator({
    messages: messages[finalLocale],
    locale: finalLocale,
    // allow dynamic key names
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

  // cache translator instance
  translatorCache.set(cacheKey, wrappedTranslator);

  return wrappedTranslator;
}

/**
 * create translator for specific domain
 */
export function createDomainTranslator(namespace: Namespace) {
  return (locale: Locale = defaultLocale) => createTranslator({ locale, namespace });
}

/**
 * predefined domain translators
 */
export const translators = Object.entries(namespaces).reduce((acc, [key, value]) => ({
  ...acc,
  [key]: createDomainTranslator(key as Namespace)
}), {} as Record<Namespace, ReturnType<typeof createDomainTranslator>>);

/**
 * clear translator cache
 */
export function clearTranslatorCache() {
  translatorCache.clear();
}
