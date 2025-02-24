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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">{t("auth.loginTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input placeholder={t("auth.emailPlaceholder")} type="email" disabled className="h-10" />
          <div className="relative">
            <div className="flex absolute inset-0 items-center">
              <span className="w-full border-t" />
            </div>
            <div className="flex relative justify-center text-xs uppercase">
              <span className="px-2 bg-background text-muted-foreground">{t("auth.orLoginWith")}</span>
            </div>
          </div>
          <Button variant="outline" type="button" disabled={isLoading} className="h-10" onClick={handleGoogleLogin}>
            {isLoading ? (
              <Icons.spinner className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 w-4 h-4" />
            )}
            {t("auth.googleLogin")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
