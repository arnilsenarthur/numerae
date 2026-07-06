import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
} from "@/components/ui/icons";
import { HTMLAttributes, ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

const alertStyles: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/80 dark:text-sky-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200",
};

const alertIcons: Record<AlertVariant, ReactNode> = {
  info: <IconInfo size="md" className="mt-0.5 shrink-0" />,
  success: <IconCheck size="md" className="mt-0.5 shrink-0" />,
  warning: <IconAlertTriangle size="md" className="mt-0.5 shrink-0" />,
  error: <IconAlertCircle size="md" className="mt-0.5 shrink-0" />,
};

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "animate-fade-in flex items-start gap-2.5 border px-3 py-2.5 text-sm",
        ui.surfaceRadius,
        alertStyles[variant],
        className,
      )}
      {...props}
    >
      {alertIcons[variant]}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium leading-snug">{title}</p> : null}
        {children ? (
          <p className={cn("leading-snug", title && "mt-0.5 opacity-90")}>
            {children}
          </p>
        ) : null}
      </div>
    </div>
  );
}
