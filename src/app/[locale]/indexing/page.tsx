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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("app.title")}</h1>
        {session?.user ? (
          <Link href={`/${locale}/apps`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("app.addApp")}
            </Button>
          </Link>
        ) : null}
      </div>

      {apps.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-lg">
          <p className="mb-4 text-gray-500">{session?.user ? t("app.pleaseAddApp") : t("app.pleaseLogin")}</p>
          {session?.user ? (
            <Link href={`/${locale}/apps`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
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
        <Suspense fallback={<div>{t("app.loading")}</div>}>
          <IndexingForm apps={apps} />
        </Suspense>
      )}
    </div>
  );
}
