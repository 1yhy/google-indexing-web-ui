"use client";

import { NextIntlClientProvider } from "next-intl";

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: any;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Shanghai"
      defaultTranslationValues={{
        strong: (chunks) => `<strong>${chunks}</strong>`,
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
