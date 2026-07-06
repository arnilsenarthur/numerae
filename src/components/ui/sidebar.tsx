"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  createContext,
  ReactNode,
  useContext,
} from "react";

type SidebarContextValue = {
  onNavigate?: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({});

type SidebarProps = {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ children, className, onNavigate }: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ onNavigate }}>
      <aside
        className={cn(
          "flex h-full w-[260px] max-w-[85vw] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
          className,
        )}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}

export function SidebarHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-b border-zinc-200 px-4 py-4 dark:border-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SidebarBrandProps = {
  href?: string;
  logo?: ReactNode;
  title: string;
  subtitle?: string;
};

export function SidebarBrand({
  href = "/",
  logo,
  title,
  subtitle,
}: SidebarBrandProps) {
  const { onNavigate } = useContext(SidebarContext);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-flex min-w-0 items-center gap-2.5"
    >
      {logo ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
          {logo}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-tight">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-zinc-500">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function SidebarNav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <nav className={cn("flex-1 overflow-y-auto px-2 py-3", className)}>
      {children}
    </nav>
  );
}

export function SidebarGroup({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 last:mb-0", className)}>
      {label ? (
        <p className="mb-1.5 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </p>
      ) : null}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

export type SidebarLinkItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

export type SidebarSubLinkItem = {
  href: string;
  label: string;
  active?: boolean;
};

type SidebarItemProps = {
  href: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  active?: boolean;
  className?: string;
  subItems?: SidebarSubLinkItem[];
  expanded?: boolean;
};

export function SidebarSubItem({
  href,
  children,
  active,
  className,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  const { onNavigate } = useContext(SidebarContext);

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center rounded-md py-1.5 pl-9 pr-2.5 text-xs font-medium transition-colors duration-200",
          active
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
          className,
        )}
      >
        <span className="truncate">{children}</span>
      </Link>
    </li>
  );
}

export function SidebarItem({
  href,
  icon,
  badge,
  children,
  active: activeProp,
  className,
  subItems,
  expanded,
}: SidebarItemProps) {
  const pathname = usePathname();
  const { onNavigate } = useContext(SidebarContext);

  const active =
    activeProp ??
    (pathname === href ||
      (href !== "/dashboard" && pathname.startsWith(href)));

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-200",
          active
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
          className,
        )}
      >
        {icon ? (
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center",
              active && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </Link>
      {expanded && subItems?.length ? (
        <ul className="mt-0.5 space-y-0.5">
          {subItems.map((item) => (
            <SidebarSubItem
              key={item.href}
              href={item.href}
              active={item.active}
            >
              {item.label}
            </SidebarSubItem>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function SidebarFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-zinc-200 p-3 dark:border-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({
  items,
  groupLabel,
}: {
  items: SidebarLinkItem[];
  groupLabel?: string;
}) {
  return (
    <SidebarGroup label={groupLabel}>
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          badge={item.badge}
        >
          {item.label}
        </SidebarItem>
      ))}
    </SidebarGroup>
  );
}
