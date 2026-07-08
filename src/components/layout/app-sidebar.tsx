"use client";

import type { Session } from "next-auth";
import { AppLogo } from "@/components/brand/app-logo";
import {
  Sidebar,
  SidebarBrand,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarNav,
  type SidebarLinkItem,
} from "@/components/ui/sidebar";

export type { SidebarLinkItem as SidebarItem };

export type SidebarSection = {
  label?: string;
  items: SidebarLinkItem[];
};

type AppSidebarProps = {
  sections: SidebarSection[];
  adminItems?: SidebarLinkItem[];
  footer?: React.ReactNode;
  onNavigate?: () => void;
  className?: string;
  session?: Session | null;
};

function UserBlock({ session }: { session?: Session | null }) {
  if (!session?.user) return null;
  const name = session.user.name ?? session.user.email ?? "";
  const email = session.user.email ?? "";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-2.5 px-1 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{name}</p>
        <p className="truncate text-[11px] text-zinc-400">{email}</p>
      </div>
    </div>
  );
}

export function AppSidebar({
  sections,
  adminItems,
  footer,
  onNavigate,
  className,
  session,
}: AppSidebarProps) {
  return (
    <Sidebar className={className} onNavigate={onNavigate}>
      <SidebarHeader>
        <SidebarBrand href="/dashboard" logo={<AppLogo size={32} />} title="Numerae" />
      </SidebarHeader>

      <SidebarNav>
        {sections.map((section, index) => (
          <SidebarMenu
            key={section.label ?? `section-${index}`}
            items={section.items}
            groupLabel={section.label}
          />
        ))}
        {adminItems?.length ? (
          <SidebarMenu items={adminItems} groupLabel="Admin" />
        ) : null}
      </SidebarNav>

      <SidebarFooter>
        <UserBlock session={session} />
        {footer ? (
          <div className="mt-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">{footer}</div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
