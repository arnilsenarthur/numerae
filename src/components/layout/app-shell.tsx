"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  AppSidebar,
  type SidebarSection,
} from "@/components/layout/app-sidebar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Dimmer } from "@/components/ui/dimmer";
import {
  IconBank,
  IconBuilding,
  IconChart,
  IconCoins,
  IconComponents,
  IconExchange,
  IconInfo,
  IconLayoutDashboard,
  IconPercent,
  IconReceipt,
  IconSettings,
  IconTarget,
  IconWallet,
} from "@/components/ui/icons";
import {
  CALCULATOR_TAB_LABELS,
  CALCULATOR_TABS,
  FINANCE_LEDGER_TABS,
  FINANCE_TABS,
  INVESTMENT_TABS,
  MARKET_DEFAULT_KIND_SLUG,
  MARKET_KIND_NAV,
  financeLedgerTabPath,
  marketKindPath,
} from "@/lib/app-routes";
import { isAdminRole } from "@/lib/user-roles";

const sidebarSections: SidebarSection[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Visão geral",
        icon: <IconLayoutDashboard size="sm" />,
      },
    ],
  },
  {
    label: "Cadastros",
    items: [
      {
        href: `/finance/${FINANCE_TABS.accounts}`,
        label: "Contas",
        icon: <IconWallet size="sm" />,
      },
      {
        href: "/companies",
        label: "Empresas",
        icon: <IconBuilding size="sm" />,
      },
    ],
  },
  {
    label: "Finanças",
    items: [
      {
        href: `/finance/${FINANCE_TABS.overview}`,
        label: "Resumo",
        icon: <IconChart size="sm" />,
      },
      {
        href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
        label: "Lançamentos",
        icon: <IconReceipt size="sm" />,
        subItems: [
          {
            href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
            label: "Histórico",
          },
          {
            href: financeLedgerTabPath(FINANCE_LEDGER_TABS.recurring),
            label: "Recorrentes",
          },
        ],
      },
      {
        href: `/finance/${FINANCE_TABS.goals}`,
        label: "Metas",
        icon: <IconTarget size="sm" />,
      },
      {
        href: "/investments",
        label: "Investimentos",
        icon: <IconChart size="sm" />,
        subItems: [
          { href: `/investments/${INVESTMENT_TABS.allocation}`, label: "Alocação sugerida" },
          { href: `/investments/${INVESTMENT_TABS.projection}`, label: "Projeção" },
        ],
      },
      {
        href: marketKindPath(MARKET_DEFAULT_KIND_SLUG),
        label: "Mercado",
        icon: <IconCoins size="sm" />,
        subItems: MARKET_KIND_NAV.map((item) => ({
          href: marketKindPath(item.slug),
          label: item.label,
        })),
      },
      {
        href: "/calculator",
        label: "Calculadoras",
        icon: <IconPercent size="sm" />,
        subItems: [
          { href: `/calculator/${CALCULATOR_TABS.exchange}`, label: CALCULATOR_TAB_LABELS.exchange },
          { href: `/calculator/${CALCULATOR_TABS.taxes}`, label: CALCULATOR_TAB_LABELS.taxes },
          { href: `/calculator/${CALCULATOR_TABS.salary}`, label: CALCULATOR_TAB_LABELS.salary },
          { href: `/calculator/${CALCULATOR_TABS.loan}`, label: CALCULATOR_TAB_LABELS.loan },
          { href: `/calculator/${CALCULATOR_TABS.fire}`, label: CALCULATOR_TAB_LABELS.fire },
        ],
      },
      {
        href: "/dicas",
        label: "Dicas",
        icon: <IconInfo size="sm" />,
      },
    ],
  },
];

const adminItems = [
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
    href: "/admin/market-assets",
    label: "Ativos",
    icon: <IconChart size="sm" />,
  },
  {
    href: "/admin/tips",
    label: "Dicas",
    icon: <IconInfo size="sm" />,
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

  useEffect(() => {
    if (!session?.user) return;

    function tickWorkers() {
      void fetch("/api/workers/tick", { method: "POST" }).catch(() => undefined);
    }

    tickWorkers();
    const interval = window.setInterval(tickWorkers, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [session?.user]);

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
          sections={sidebarSections}
          adminItems={visibleAdminItems}
          onNavigate={() => setMobileOpen(false)}
          session={session}
          footer={<SignOutButton />}
        />
      </div>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              tooltip="Abrir menu"
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

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
