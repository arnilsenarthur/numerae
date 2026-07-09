"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { IconLogout } from "@/components/ui/icons";
import { useConfirm } from "@/hooks/use-confirm";

export function SignOutButton() {
  const { confirm, dialog } = useConfirm();

  async function handleSignOut() {
    const ok = await confirm({
      title: "Sair da conta",
      message: "Deseja encerrar sua sessão neste dispositivo?",
      confirmLabel: "Sair",
      tone: "error",
    });

    if (ok) {
      void signOut({ callbackUrl: "/" });
    }
  }

  return (
    <>
      <Button variant="danger" className="w-full" onClick={() => void handleSignOut()}>
        <IconLogout size="sm" />
        Sair
      </Button>
      {dialog}
    </>
  );
}
