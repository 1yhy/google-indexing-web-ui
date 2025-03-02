import { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { notFound } from "next/navigation";
import { locales, t } from "@/i18n";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { IntlProvider } from "@/components/intl-provider";

const inter = Inter({ subsets: ["latin"] });

interface RootLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export async function generateMetadata({ params: { locale } }: RootLayoutProps): Promise<Metadata> {
  // verify language parameter
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return {
    title: t("app.title"),
    description: t("app.description"),
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  // verify language parameter
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // enable static rendering
  unstable_setRequestLocale(locale);

  const [session, messages] = await Promise.all([auth(), getMessages({ locale })]);

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <IntlProvider locale={locale} messages={messages}>
          <Providers session={session}>{children}</Providers>
        </IntlProvider>
        <Toaster />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
