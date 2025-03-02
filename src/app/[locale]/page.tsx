import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n";

export default async function RootPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // verify language parameter
  if (!["en", "zh"].includes(locale)) {
    redirect(`/${defaultLocale}/indexing`);
  }

  // redirect to indexing page of current language
  redirect(`/${locale}/indexing`);
}
