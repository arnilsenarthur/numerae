"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "error";
  loading?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleClose(value: boolean) {
    if (state?.loading) return;
    state?.resolve(value);
    setState(null);
  }

  const dialog = state ? (
    <Modal
      open
      onClose={() => handleClose(false)}
      title={state.title}
      message={state.message}
      tone={state.tone ?? "warning"}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleClose(false)}
            disabled={state.loading}
          >
            {state.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            type="button"
            variant={state.tone === "error" ? "danger" : "primary"}
            onClick={() => handleClose(true)}
            loading={state.loading}
          >
            {state.confirmLabel ?? "Confirmar"}
          </Button>
        </>
      }
    />
  ) : null;

  return { confirm, dialog };
}
