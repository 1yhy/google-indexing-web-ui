import { useLocale } from "next-intl";

export function useLocalePath() {
  const locale = useLocale();

  return (path: string) => {
    // 移除开头和结尾的斜杠
    const cleanPath = path.replace(/^\/+|\/+$/g, "");

    // 如果路径已经包含语言前缀，移除它
    const pathWithoutLocale = cleanPath.replace(/^[a-z]{2}\//, "");

    // 构建最终路径
    return `/${locale}/${pathWithoutLocale}`;
  };
}
