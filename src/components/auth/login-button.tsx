"use client";

import { useLoginDialog } from "@/hooks/use-login-dialog";

export function LoginButton({ children }: { children: React.ReactNode }) {
  const { openLoginDialog } = useLoginDialog();

  return (
    <div onClick={openLoginDialog} className="cursor-pointer">
      {children}
    </div>
  );
}
