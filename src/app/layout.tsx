import { Metadata } from "next";
import React from "react";
import { serverTranslators } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = serverTranslators.app();
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
