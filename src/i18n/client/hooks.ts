import { useTranslations as useNextIntlTranslations } from "next-intl";
import { namespaces, Namespace } from "../config";

/**
 * create a translation hook with namespace
 */
export function createNamespacedTranslations(namespace: Namespace) {
  return () => {
    const t = useNextIntlTranslations(namespace);
    return (key: string, params?: Record<string, any>) => t(key, params);
  };
}

/**
 * predefined domain translation hooks
 */
export const translations = Object.entries(namespaces).reduce((acc, [key]) => ({
  ...acc,
  [key]: createNamespacedTranslations(key as Namespace)
}), {} as Record<Namespace, ReturnType<typeof createNamespacedTranslations>>);
