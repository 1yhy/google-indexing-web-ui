import { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { notFound } from "next/navigation";
import { locales } from "@/i18n";
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
  const messages: any = await getMessages({ locale });

  return {
    title: messages?.app?.title || "Google Indexing Web UI",
    description: messages?.app?.description || "A web interface for Google Indexing API",
  };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  // 验证语言参数
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // 启用静态渲染
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
