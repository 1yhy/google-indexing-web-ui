import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n";

export default async function RootPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // 验证语言参数
  if (!["en", "zh"].includes(locale)) {
    redirect(`/${defaultLocale}/indexing`);
  }

  // 重定向到当前语言的索引页面
  redirect(`/${locale}/indexing`);
}
