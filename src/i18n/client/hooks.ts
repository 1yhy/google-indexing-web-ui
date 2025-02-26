import { useTranslations as useNextIntlTranslations } from "next-intl";
import { namespaces, Namespace } from "../config";

/**
 * 创建带有命名空间的翻译 hook
 */
export function createNamespacedTranslations(namespace: Namespace) {
  return () => {
    const t = useNextIntlTranslations(namespace);
    return (key: string, params?: Record<string, any>) => t(key, params);
  };
}

/**
 * 预定义的领域翻译 hooks
 */
export const translations = Object.entries(namespaces).reduce((acc, [key]) => ({
  ...acc,
  [key]: createNamespacedTranslations(key as Namespace)
}), {} as Record<Namespace, ReturnType<typeof createNamespacedTranslations>>);
