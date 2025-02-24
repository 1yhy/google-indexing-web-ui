import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n";

export default async function AuthErrorPage({
  searchParams,
  params: { locale },
}: {
  searchParams: { error?: string };
  params: { locale: string };
}) {
  // 启用静态渲染
  unstable_setRequestLocale(locale);

  const t = await getTranslations();
  const error = searchParams.error;

  return (
    <div className="flex flex-col justify-center items-center py-2 min-h-screen">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-red-600">{t("auth.error")}</h1>
        <p className="mb-8 text-lg text-gray-600">
          {error === "OAuthCallback"
            ? t("auth.errors.oauthCallback")
            : error === "OAuthSignin"
            ? t("auth.errors.oauthSignin")
            : error === "Callback"
            ? t("auth.errors.callback")
            : t("auth.errors.unknown")}
        </p>
        <Link
          href="/indexing"
          className="inline-flex items-center px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-md border border-transparent shadow-sm hover:bg-blue-700"
        >
          {t("common.backToHome")}
        </Link>
      </div>
    </div>
  );
}
