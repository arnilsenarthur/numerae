import Link from "next/link";
import { ReactNode } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { AuthStepIndicator } from "@/components/auth/auth-step-indicator";
import { ui } from "@/components/ui/tokens";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export const authLinkClass =
  "font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  step?: {
    current: number;
    total: number;
    labels?: string[];
  };
};

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
  step,
}: AuthCardProps) {
  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div className="mb-8 animate-fade-in-down text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-[1.02]"
        >
          <AppLogo size={40} />
          <span className="text-2xl font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      <div
        className={cn(
          "animate-scale-in border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-black/20",
          ui.surfaceRadius,
        )}
      >
        {step ? (
          <AuthStepIndicator
            current={step.current}
            total={step.total}
            labels={step.labels}
          />
        ) : null}
        {children}
      </div>

      {footer ? (
        <div className="animate-fade-in mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
