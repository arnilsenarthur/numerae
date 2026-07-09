"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { IconLogout } from "@/components/ui/icons";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n/locale-provider";

export function SignOutButton() {
  const t = useT();
  const { confirm, dialog } = useConfirm();

  async function handleSignOut() {
    const ok = await confirm({
      title: t("ui.signOut.title"),
      message: t("ui.signOut.message"),
      confirmLabel: t("ui.signOut.confirm"),
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
        {t("ui.signOut.button")}
      </Button>
      {dialog}
    </>
  );
}
