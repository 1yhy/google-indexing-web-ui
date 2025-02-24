"use client";

import { SessionProvider } from "next-auth/react";
import { UserMenu } from "@/components/auth/user-menu";
import { LoginDialogProvider } from "@/hooks/use-login-dialog";
import { LoginDialog } from "@/components/auth/login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n";

function Header() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center h-14">
        <div className="flex mr-4">
          <Link href="/indexing" className="flex items-center space-x-2">
            <span className="font-bold">{t("app.title")}</span>
          </Link>
        </div>
        <div className="flex flex-1 justify-end">
          <nav className="flex gap-2 items-center">
            <LanguageSwitcher />
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  return (
    <SessionProvider session={session} refetchInterval={0}>
      <LoginDialogProvider>
        <div className="relative min-h-screen">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto max-w-[1200px]">{children}</div>
          </main>
        </div>
        <LoginDialog />
      </LoginDialogProvider>
    </SessionProvider>
  );
}
