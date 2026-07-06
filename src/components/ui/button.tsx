import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  iconOnly?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      iconOnly,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex w-auto items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200 cursor-pointer",
          "[&>svg]:shrink-0",
          ui.controlRadius,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
          size === "sm" && "h-8 px-2.5 text-xs",
          size === "md" && "h-9 px-3 text-sm",
          size === "lg" && "h-10 px-4 text-sm",
          iconOnly && size === "sm" && "w-8 shrink-0 px-0",
          iconOnly && size === "md" && "w-9 shrink-0 px-0",
          iconOnly && size === "lg" && "w-10 shrink-0 px-0",
          variant === "primary" &&
            "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500",
          variant === "secondary" &&
            "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
          variant === "ghost" &&
            "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Aguarde...
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
