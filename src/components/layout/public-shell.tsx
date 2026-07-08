import Link from "next/link";
import { ReactNode } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { CREATOR_LINKS, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type PublicShellProps = {
  children: ReactNode;
  className?: string;
};

export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div className={cn("relative flex min-h-screen flex-col", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]"
      />
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2.5">
            <AppLogo size={32} priority />
            <span className="truncate text-base font-semibold tracking-tight">{SITE_NAME}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login">
              <Button type="button" variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button type="button" size="sm">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <p className="text-center sm:text-left">
            {SITE_NAME} — plataforma de finanças pessoais
          </p>
          <div className="flex items-center gap-4">
            <a
              href={CREATOR_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
            >
              GitHub
            </a>
            <a
              href={CREATOR_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
