import { auth } from "@/auth";
import { unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n";
import { notFound } from "next/navigation";
import LogsClient from "@/components/logs/logs-client";
import { getLogs } from "@/app/api/logs/service";

const PAGE_SIZE = 10;

interface LogsPageProps {
  params: {
    locale: string;
  };
  searchParams: {
    page?: string;
  };
}

export default async function LogsPage({ params: { locale }, searchParams }: LogsPageProps) {
  // verify language parameter
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // enable server-side internationalization
  unstable_setRequestLocale(locale);

  const session = await auth();
  const currentPage = Number(searchParams.page) || 1;

  if (!session?.user) {
    return <LogsClient logBatches={[]} currentPage={1} totalPages={0} />;
  }

  try {
    const { batches, total } = await getLogs({
      userId: session.user.id,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    });

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
      <LogsClient logBatches={batches} currentPage={currentPage} totalPages={totalPages} />
    );
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return (
      <LogsClient logBatches={[]} currentPage={1} totalPages={0} />
    );
  }
}
