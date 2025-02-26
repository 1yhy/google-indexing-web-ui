import { Locale, Namespace } from "../config";

export interface TranslatorOptions {
  locale?: Locale;
  namespace?: Namespace;
  fallback?: string;
}

export interface Translator {
  t: (key: string, params?: Record<string, any>) => string;
  locale: Locale;
  namespace?: Namespace;
}

export interface TranslatorFactory {
  (options?: TranslatorOptions): Translator;
}

export type DomainTranslator = (locale?: Locale) => Translator;
