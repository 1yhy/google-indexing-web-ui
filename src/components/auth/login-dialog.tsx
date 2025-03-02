"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { useLoginDialog } from "@/hooks/use-login-dialog";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

export function LoginDialog() {
  const { isOpen, closeLoginDialog } = useLoginDialog();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();
  const locale = useLocale();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: `/${locale}/indexing`,
        redirect: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeLoginDialog}>
      <DialogContent className="w-[95vw] max-w-[425px] p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center md:text-xl">{t("auth.loginTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3 md:gap-4 md:py-4">
          <Input placeholder={t("auth.emailPlaceholder")} type="email" disabled className="h-9 text-sm md:h-10 md:text-base" />
          <div className="relative">
            <div className="flex absolute inset-0 items-center">
              <span className="w-full border-t" />
            </div>
            <div className="flex relative justify-center text-xs uppercase md:text-sm">
              <span className="px-2 bg-background text-muted-foreground">{t("auth.orLoginWith")}</span>
            </div>
          </div>
          <Button variant="outline" type="button" disabled={isLoading} className="h-9 text-sm md:h-10 md:text-base" onClick={handleGoogleLogin}>
            {isLoading ? (
              <Icons.spinner className="mr-2 w-3 h-3 animate-spin md:w-4 md:h-4" />
            ) : (
              <Icons.google className="mr-2 w-3 h-3 md:w-4 md:h-4" />
            )}
            {t("auth.googleLogin")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
