import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IndexingForm } from "@/components/indexing/indexing-form";
import { Button } from "@/components/ui/button";
import { Plus, LogIn } from "lucide-react";
import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/login-button";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function IndexingPage() {
  const session = await auth();
  const t = await getTranslations();
  const locale = await getLocale();

  const apps = session?.user
    ? await prisma.app.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          domain: true,
        },
      })
    : [];

  return (
    <div className="py-4 space-y-4 md:py-6 md:space-y-6">
      <div className="flex gap-4 md:flex-row md:justify-between md:items-center md:gap-0">
        <h1 className="text-lg font-bold md:text-2xl">{t("app.title")}</h1>
        {session?.user ? (
          <Link href={`/${locale}/apps`}>
            <Button variant="outline" size="sm" className="gap-2 text-sm w-30 md:w-auto">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {t("app.addApp")}
            </Button>
          </Link>
        ) : null}
      </div>

      {apps.length === 0 ? (
        <div className="py-8 text-center bg-white rounded-lg md:py-12">
          <p className="mb-4 text-sm text-gray-500 md:text-base">
            {session?.user ? t("app.pleaseAddApp") : t("app.pleaseLogin")}
          </p>
          {session?.user ? (
            <Link href={`/${locale}/apps`}>
              <Button variant="outline" size="sm" className="gap-2 w-full text-sm md:w-auto">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t("app.addApp")}
              </Button>
            </Link>
          ) : (
            <LoginButton>
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="w-4 h-4" />
                {t("auth.loginTitle")}
              </Button>
            </LoginButton>
          )}
        </div>
      ) : (
        <Suspense fallback={<div className="text-sm md:text-base">{t("app.loading")}</div>}>
          <IndexingForm apps={apps} />
        </Suspense>
      )}
    </div>
  );
}
