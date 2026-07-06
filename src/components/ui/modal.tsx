"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
} from "@/components/ui/icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ModalTone = "default" | "info" | "success" | "warning" | "error";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: ModalTone;
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const toneStyles: Record<
  Exclude<ModalTone, "default">,
  { border: string; header: string; icon: ReactNode }
> = {
  info: {
    border: "border-sky-200 dark:border-sky-900",
    header: "bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
    icon: <IconInfo size="md" className="text-sky-600 dark:text-sky-400" />,
  },
  success: {
    border: "border-emerald-200 dark:border-emerald-900",
    header:
      "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    icon: (
      <IconCheck size="md" className="text-emerald-600 dark:text-emerald-400" />
    ),
  },
  warning: {
    border: "border-amber-200 dark:border-amber-900",
    header: "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    icon: (
      <IconAlertTriangle
        size="md"
        className="text-amber-600 dark:text-amber-400"
      />
    ),
  },
  error: {
    border: "border-red-200 dark:border-red-900",
    header: "bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    icon: <IconAlertCircle size="md" className="text-red-600 dark:text-red-400" />,
  },
};

const EXIT_MS = 200;

export function Modal({
  open,
  onClose,
  title,
  description,
  message,
  children,
  footer,
  className,
  size = "sm",
  tone = "default",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const scrollYRef = useRef(0);

  const toneConfig = tone !== "default" ? toneStyles[tone] : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      return;
    }

    if (visible) {
      setClosing(true);
      setEntered(false);
      const timeout = window.setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, EXIT_MS);
      return () => window.clearTimeout(timeout);
    }
  }, [open, visible]);

  useEffect(() => {
    if (!visible || closing) {
      setEntered(false);
      return;
    }

    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [visible, closing]);

  useEffect(() => {
    if (!visible) return;

    scrollYRef.current = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollYRef.current}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closing) onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      style.overflow = previous.overflow;

      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo({ top: scrollYRef.current, left: 0, behavior: "auto" });
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [visible, onClose, closing]);

  if (!mounted || !visible) return null;

  const isShown = entered && !closing;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 min-h-[100dvh] w-screen cursor-pointer bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
          isShown ? "opacity-100" : "opacity-0",
        )}
        onClick={closing ? undefined : onClose}
        aria-hidden={!isShown}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[51] flex min-h-[100dvh] items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <div
          className={cn(
            "pointer-events-auto w-full overflow-hidden border bg-white shadow-xl transition-all duration-200 ease-out dark:bg-zinc-950",
            ui.surfaceRadius,
            sizes[size],
            toneConfig?.border ?? ui.fieldBorder,
            isShown ? "scale-100 opacity-100" : "scale-95 opacity-0",
            className,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {title || description ? (
            <div
              className={cn(
                "border-b border-zinc-200 px-4 py-3 dark:border-zinc-800",
                toneConfig?.header,
                toneConfig && "rounded-t-xl",
              )}
            >
              <div className="flex items-start gap-2.5">
                {toneConfig?.icon ? (
                  <span className="mt-0.5 shrink-0">{toneConfig.icon}</span>
                ) : null}
                <div className="min-w-0 flex-1">
                  {title ? (
                    <h2
                      id="modal-title"
                      className={cn(
                        "text-sm font-semibold",
                        toneConfig
                          ? "text-inherit"
                          : "text-zinc-900 dark:text-zinc-100",
                      )}
                    >
                      {title}
                    </h2>
                  ) : null}
                  {description ? (
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        toneConfig ? "opacity-70" : "text-zinc-500",
                      )}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {message || children ? (
            <div className="space-y-3 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
              {message ? <p>{message}</p> : null}
              {children}
            </div>
          ) : null}

          {footer ? (
            <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
