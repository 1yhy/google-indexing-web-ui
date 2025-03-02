import { defaultLocale, type Locale, type Namespace, namespaces } from "../config";
import { translators } from "./translator";
import type { Translator } from "./types";

/**
 * simplified translation function
 * @param key translation key separated by dots, e.g. 'logs.errors.publishMetadataFailed'
 * @param params optional parameter object
 * @returns translated text
 */
export const t = (key: string, params?: Record<string, any>): string => {
  const [ns, ...paths] = key.split('.');
  // type guard: check if it is a valid namespace
  const isValidNamespace = (ns: string): ns is Namespace =>
    Object.values(namespaces).includes(ns as Namespace);

  if (!isValidNamespace(ns)) {
    console.warn(`Invalid namespace: ${ns}`);
    return key;
  }
  return getI18n().t(ns, paths.join('.'), params);
};

/**
 * multi-language service class
 * used to handle multi-language translation, avoiding repeated initialization of translators
 */
export class I18nService {
  private static instance: I18nService;
  private locale: Locale;
  private translators: Partial<Record<Namespace, Translator>>;
  private static systemLocale: Locale = defaultLocale;

  private constructor() {
    this.locale = I18nService.systemLocale;
    this.translators = {};
  }

  /**
   * get singleton instance
   */
  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * set system language
   */
  public static setSystemLocale(locale: Locale): void {
    I18nService.systemLocale = locale;
    if (I18nService.instance) {
      I18nService.instance.setLocale(locale);
    }
  }

  /**
   * get system language
   */
  public static getSystemLocale(): Locale {
    return I18nService.systemLocale;
  }

  /**
   * set current instance language (usually not directly called)
   */
  private setLocale(locale: Locale): void {
    this.locale = locale;
    // clear translator cache to create new translator for new language
    this.translators = {};
  }

  /**
   * get current language
   */
  public getLocale(): Locale {
    return this.locale;
  }

  /**
   * get translator
   */
  private getTranslator(namespace: Namespace): Translator {
    if (!this.translators[namespace]) {
      this.translators[namespace] = translators[namespace](this.locale);
    }
    return this.translators[namespace]!;
  }

  /**
   * translate text
   */
  public t(namespace: Namespace, key: string, params?: Record<string, any>): string {
    const translator = this.getTranslator(namespace);
    return translator.t(key, params);
  }
}

// export a convenient function to get the translation instance
export const getI18n = () => I18nService.getInstance();

// export a convenient function to set system language
export const setSystemLocale = (locale: Locale) => I18nService.setSystemLocale(locale);
