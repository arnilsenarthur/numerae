"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { HoverTooltip } from "@/components/ui/tooltip";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
  entered?: boolean;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-200",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/80 dark:text-sky-200",
};

const EXIT_MS = 200;

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((item) => {
        const isShown = item.entered && !item.exiting;

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 border px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm transition-all duration-200 ease-out",
              ui.surfaceRadius,
              toastStyles[item.type],
              isShown
                ? "translate-x-0 opacity-100"
                : "translate-x-4 opacity-0",
            )}
          >
            <p className="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
            <HoverTooltip label="Fechar">
              <button
                type="button"
                aria-label="Fechar notificação"
                onClick={() => onDismiss(item.id)}
                className={cn(
                  "shrink-0 p-0.5 opacity-70 transition-opacity hover:opacity-100",
                  ui.iconButton,
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </HoverTooltip>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      const timeout = timeoutsRef.current.get(id);
      if (timeout) window.clearTimeout(timeout);
      timeoutsRef.current.delete(id);

      setToasts((current) =>
        current.map((item) =>
          item.id === id ? { ...item, exiting: true, entered: false } : item,
        ),
      );

      window.setTimeout(() => removeToast(id), EXIT_MS);
    },
    [removeToast],
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current,
        { id, message, type, entered: false, exiting: false },
      ]);

      requestAnimationFrame(() => {
        setToasts((current) =>
          current.map((item) =>
            item.id === id ? { ...item, entered: true } : item,
          ),
        );
      });

      const timeout = window.setTimeout(() => dismiss(id), 4000);
      timeoutsRef.current.set(id, timeout);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
