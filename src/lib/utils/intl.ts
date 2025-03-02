import { useLocale } from "next-intl";

export function useLocalePath() {
  const locale = useLocale();

  return (path: string) => {
    // remove leading and trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, "");

    // if path already contains language prefix, remove it
    const pathWithoutLocale = cleanPath.replace(/^[a-z]{2}\//, "");

    // build final path
    return `/${locale}/${pathWithoutLocale}`;
  };
}
