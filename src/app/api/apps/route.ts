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

    // 验证必填字段
    if (!domain || !appEmail || !credentials) {
      return NextResponse.json({ error: t("apps.errors.missingFields") }, { status: 400 });
    }

    // 解析服务账号凭据
    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (error) {
      return NextResponse.json({ error: t("apps.errors.invalidJsonFormat") }, { status: 400 });
    }

    // 验证服务账号凭据
    const isValid = await validateServiceAccount(parsedCredentials.client_email, parsedCredentials.private_key, domain);

    if (!isValid) {
      return NextResponse.json({ error: t("apps.errors.invalidCredentials") }, { status: 400 });
    }

    // 创建应用并关联用户
    const app = await prisma.app.create({
      data: {
        name: domain,
        domain,
        appEmail,
        jsonKey: credentials,
        userId: session.user.id, // 关联到当前登录用户
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

    // 只获取当前用户的应用
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

    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 1. 删除相关的 URL 缓存
      await tx.urlCache.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 2. 删除相关的索引日志
      await tx.indexLog.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 3. 删除相关的普通日志
      await tx.log.deleteMany({
        where: {
          appId: {
            in: ids,
          },
        },
      });

      // 4. 最后删除应用
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
