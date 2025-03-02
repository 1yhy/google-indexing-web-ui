import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateServiceAccount } from "@/lib/google";
import { auth } from "@/auth";
import { t } from "@/i18n";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 401 });
    }

    const body = await request.json();
    const { domain, appEmail, credentials } = body;

    // verify required fields
    if (!domain || !appEmail || !credentials) {
      return NextResponse.json({ error: t("apps.errors.missingFields") }, { status: 400 });
    }

    // parse service account credentials
    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (error) {
      return NextResponse.json({ error: t("apps.errors.invalidJsonFormat") }, { status: 400 });
    }

    // verify service account credentials
    const isValid = await validateServiceAccount(parsedCredentials.client_email, parsedCredentials.private_key, domain);

    if (!isValid) {
      return NextResponse.json({ error: t("apps.errors.invalidCredentials") }, { status: 400 });
    }

    // create app and associate with user
    const app = await prisma.app.create({
      data: {
        name: domain,
        domain,
        appEmail,
        jsonKey: credentials,
        userId: session.user.id, // associate with current login user
      },
    });

    return NextResponse.json(app);
  } catch (error) {
    console.error(t("apps.addFailed"), error);
    return NextResponse.json({ error: error instanceof Error ? error.message : t("apps.addFailed") }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 401 });
    }

    // get apps of current user
    const apps = await prisma.app.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(apps);
  } catch (error) {
    console.error(t("apps.loadError"), error);
    return NextResponse.json({ error: t("apps.loadError") }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",");

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: t("apps.selectToDelete") }, { status: 400 });
    }

    // use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // 1. delete related URL cache
      await tx.urlCache.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 2. delete related indexing logs
      await tx.indexLog.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 3. delete related normal logs
      await tx.log.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 4. delete apps
      await tx.app.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
    });

    return NextResponse.json({ message: t("apps.deleteSuccess") });
  } catch (error) {
    console.error(t("apps.deleteFailed"), error);
    return NextResponse.json(
      {
        error: t("apps.deleteFailed"),
        details: error instanceof Error ? error.message : t("common.errors.unknown"),
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
