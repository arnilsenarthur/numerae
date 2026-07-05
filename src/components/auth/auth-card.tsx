import Link from "next/link";
import { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
            N
          </span>
          <span className="text-2xl font-semibold tracking-tight">Numerae</span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>

      {footer ? (
        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
