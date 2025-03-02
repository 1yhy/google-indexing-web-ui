import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AppsClient from "@/components/apps/apps-client";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const session = await auth();
  const t = await getTranslations();

  try {
    const apps = session?.user
      ? await prisma.app.findMany({
          where: {
            userId: session.user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
            domain: true,
            appEmail: true,
            description: true,
            createdAt: true,
          },
        })
      : [];

    return (
        <AppsClient apps={apps} />
    );
  } catch (error) {
    console.error("fetch apps error:", error);
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 rounded-md border border-red-200">
          <h3 className="text-sm font-medium text-red-800">{t("apps.loadError")}</h3>
          <p className="mt-2 text-sm text-red-700">
            {error instanceof Error ? error.message : t("apps.checkConnection")}
          </p>
        </div>
      </div>
    );
  }
}
