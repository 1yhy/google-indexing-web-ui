import { defaultLocale, type Locale, type Namespace, namespaces } from "../config";
import { translators } from "./translator";
import type { Translator } from "./types";

/**
 * 简化的翻译函数
 * @param key 使用点号分隔的完整翻译键，如 'logs.errors.publishMetadataFailed'
 * @param params 可选的参数对象
 * @returns 翻译后的文本
 */
export const t = (key: string, params?: Record<string, any>): string => {
  const [ns, ...paths] = key.split('.');
  // 类型守卫：检查是否是有效的命名空间
  const isValidNamespace = (ns: string): ns is Namespace =>
    Object.values(namespaces).includes(ns as Namespace);

  if (!isValidNamespace(ns)) {
    console.warn(`Invalid namespace: ${ns}`);
    return key;
  }
  return getI18n().t(ns, paths.join('.'), params);
};

/**
 * 多语言服务类
 * 用于统一处理多语言翻译，避免重复初始化翻译器
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
   * 获取单例实例
   */
  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * 设置系统语言
   */
  public static setSystemLocale(locale: Locale): void {
    I18nService.systemLocale = locale;
    if (I18nService.instance) {
      I18nService.instance.setLocale(locale);
    }
  }

  /**
   * 获取系统语言
   */
  public static getSystemLocale(): Locale {
    return I18nService.systemLocale;
  }

  /**
   * 设置当前实例语言（通常不需要直接调用）
   */
  private setLocale(locale: Locale): void {
    this.locale = locale;
    // 清空翻译器缓存，以便重新创建新语言的翻译器
    this.translators = {};
  }

  /**
   * 获取当前语言
   */
  public getLocale(): Locale {
    return this.locale;
  }

  /**
   * 获取翻译器
   */
  private getTranslator(namespace: Namespace): Translator {
    if (!this.translators[namespace]) {
      this.translators[namespace] = translators[namespace](this.locale);
    }
    return this.translators[namespace]!;
  }

  /**
   * 翻译文本
   */
  public t(namespace: Namespace, key: string, params?: Record<string, any>): string {
    const translator = this.getTranslator(namespace);
    return translator.t(key, params);
  }
}

// 导出一个便捷的获取翻译实例的函数
export const getI18n = () => I18nService.getInstance();

// 导出便捷的设置系统语言函数
export const setSystemLocale = (locale: Locale) => I18nService.setSystemLocale(locale);
