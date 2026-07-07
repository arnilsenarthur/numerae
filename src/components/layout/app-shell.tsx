"use client";

import { ReactNode, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { AppSidebar, SidebarItem } from "@/components/layout/app-sidebar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Dimmer } from "@/components/ui/dimmer";
import {
  IconBank,
  IconBuilding,
  IconCoins,
  IconComponents,
  IconExchange,
  IconLayoutDashboard,
  IconReceipt,
  IconSettings,
  IconTarget,
} from "@/components/ui/icons";
import { isAdminRole } from "@/lib/user-roles";

const sidebarItems: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: <IconLayoutDashboard size="sm" />,
  },
  {
    href: "/money-map",
    label: "Plano financeiro",
    icon: <IconTarget size="sm" />,
  },
  {
    href: "/companies",
    label: "Empresas",
    icon: <IconBuilding size="sm" />,
  },
];

const adminItems: SidebarItem[] = [
  {
    href: "/admin/institutions",
    label: "Instituições",
    icon: <IconBank size="sm" />,
  },
  {
    href: "/admin/countries",
    label: "Países",
    icon: <IconExchange size="sm" />,
  },
  {
    href: "/admin/currencies",
    label: "Moedas",
    icon: <IconCoins size="sm" />,
  },
  {
    href: "/admin/workers",
    label: "Workers",
    icon: <IconSettings size="sm" />,
  },
  {
    href: "/admin/audit",
    label: "Log",
    icon: <IconReceipt size="sm" />,
  },
  {
    href: "/design-system",
    label: "Design System",
    icon: <IconComponents size="sm" />,
  },
];

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  const visibleAdminItems = useMemo(
    () => (isAdminRole(session?.user?.role) ? adminItems : undefined),
    [session?.user?.role],
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Dimmer open={mobileOpen} onClose={() => setMobileOpen(false)} className="lg:hidden" />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AppSidebar
          items={sidebarItems}
          adminItems={visibleAdminItems}
          onNavigate={() => setMobileOpen(false)}
          footer={<SignOutButton />}
        />
      </div>

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </Button>

            <div className="min-w-0 flex-1">
              {title ? (
                <>
                  <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="truncate text-sm text-zinc-500">{subtitle}</p>
                  ) : null}
                </>
              ) : null}
            </div>

            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
