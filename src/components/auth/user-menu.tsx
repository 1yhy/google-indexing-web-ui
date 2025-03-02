"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut } from "lucide-react";
import { LoginButton } from "@/components/auth/login-button";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

export function UserMenu() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  if (status === "loading") {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="w-5 h-5" />
      </Button>
    );
  }

  if (!session) {
    return (
      <LoginButton>
        <Button variant="ghost" size="icon">
          <User className="w-5 h-5" />
        </Button>
      </LoginButton>
    );
  }

  const handleLogout = () => {
    signOut({ callbackUrl: `/${locale}/indexing` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-8 h-8 rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
            <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>{t("auth.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
