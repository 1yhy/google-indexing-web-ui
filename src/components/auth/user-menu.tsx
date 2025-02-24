"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-8 h-8 rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
            <AvatarFallback>{session.user?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {session.user?.name && <p className="font-medium">{session.user.name}</p>}
            {session.user?.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">{session.user.email}</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onSelect={() => signOut({ callbackUrl: `/${locale}/indexing` })}>
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
