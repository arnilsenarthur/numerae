"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  IconBarChart,
  IconCoins,
  IconComponents,
  IconExchange,
  IconInfo,
  IconInvest,
  IconLayoutDashboard,
  IconPercent,
  IconPiggyBank,
  IconReceipt,
  IconSettings,
  IconWrench,
  IconTarget,
  IconWallet,
} from "@/components/ui/icons";
import {
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
import { useT } from "@/i18n/locale-provider";
import type { TranslateFn } from "@/i18n/translate";

function buildSidebarSections(t: TranslateFn): SidebarSection[] {
  return [
    {
      items: [
        {
          href: "/dashboard",
          label: t("nav.dashboard"),
          icon: <IconLayoutDashboard size="sm" />,
        },
      ],
    },
    {
      label: t("nav.group.registrations"),
      items: [
        {
          href: `/finance/${FINANCE_TABS.accounts}`,
          label: t("nav.accounts"),
          icon: <IconWallet size="sm" />,
        },
        {
          href: "/companies",
          label: t("nav.companies"),
          icon: <IconBuilding size="sm" />,
        },
      ],
    },
    {
      label: t("nav.group.finance"),
      items: [
        {
          href: `/finance/${FINANCE_TABS.overview}`,
          label: t("nav.finance.overview"),
          icon: <IconChart size="sm" />,
        },
        {
          href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
          label: t("nav.finance.transactions"),
          icon: <IconReceipt size="sm" />,
          subItems: [
            {
              href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
              label: t("nav.finance.transactionsHistory"),
            },
            {
              href: financeLedgerTabPath(FINANCE_LEDGER_TABS.recurring),
              label: t("nav.finance.recurring"),
            },
            {
              href: `/finance/${FINANCE_TABS.subscriptions}`,
              label: t("nav.finance.subscriptions"),
            },
          ],
        },
        {
          href: `/finance/${FINANCE_TABS.goals}`,
          label: t("nav.finance.goals"),
          icon: <IconTarget size="sm" />,
        },
        {
          href: `/finance/${FINANCE_TABS.budgets}`,
          label: t("nav.finance.budgets"),
          icon: <IconPiggyBank size="sm" />,
        },
        {
          href: `/finance/${FINANCE_TABS.reports}`,
          label: t("nav.finance.reports"),
          icon: <IconBarChart size="sm" />,
        },
        {
          href: "/investments",
          label: t("nav.finance.investments"),
          icon: <IconInvest size="sm" />,
          subItems: [
            {
              href: `/investments/${INVESTMENT_TABS.allocation}`,
              label: t("nav.investments.allocation"),
            },
            {
              href: `/investments/${INVESTMENT_TABS.projection}`,
              label: t("nav.investments.projection"),
            },
          ],
        },
        {
          href: marketKindPath(MARKET_DEFAULT_KIND_SLUG),
          label: t("nav.finance.market"),
          icon: <IconCoins size="sm" />,
          subItems: MARKET_KIND_NAV.map((item) => ({
            href: marketKindPath(item.slug),
            label: t(`section.market.kind.${item.slug}`),
          })),
        },
        {
          href: "/calculator",
          label: t("nav.finance.calculators"),
          icon: <IconPercent size="sm" />,
          subItems: [
            {
              href: `/calculator/${CALCULATOR_TABS.exchange}`,
              label: t("nav.calculator.exchange"),
            },
            {
              href: `/calculator/${CALCULATOR_TABS.taxes}`,
              label: t("nav.calculator.taxes"),
            },
            {
              href: `/calculator/${CALCULATOR_TABS.salary}`,
              label: t("nav.calculator.salary"),
            },
            {
              href: `/calculator/${CALCULATOR_TABS.loan}`,
              label: t("nav.calculator.loan"),
            },
            {
              href: `/calculator/${CALCULATOR_TABS.fire}`,
              label: t("nav.calculator.fire"),
            },
          ],
        },
        {
          href: "/dicas",
          label: t("nav.finance.tips"),
          icon: <IconInfo size="sm" />,
        },
      ],
    },
    {
      items: [
        {
          href: "/settings",
          label: t("nav.finance.settings"),
          icon: <IconWrench size="sm" />,
        },
      ],
    },
  ];
}

function buildAdminItems(t: TranslateFn) {
  return [
    {
      href: "/admin/institutions",
      label: t("nav.admin.institutions"),
      icon: <IconBank size="sm" />,
    },
    {
      href: "/admin/countries",
      label: t("nav.admin.countries"),
      icon: <IconExchange size="sm" />,
    },
    {
      href: "/admin/currencies",
      label: t("nav.admin.currencies"),
      icon: <IconCoins size="sm" />,
    },
    {
      href: "/admin/market-assets",
      label: t("nav.admin.marketAssets"),
      icon: <IconChart size="sm" />,
    },
    {
      href: "/admin/tips",
      label: t("nav.admin.tips"),
      icon: <IconInfo size="sm" />,
    },
    {
      href: "/admin/workers",
      label: t("nav.admin.workers"),
      icon: <IconSettings size="sm" />,
    },
    {
      href: "/admin/audit",
      label: t("nav.admin.audit"),
      icon: <IconReceipt size="sm" />,
    },
    {
      href: "/design-system",
      label: t("nav.admin.designSystem"),
      icon: <IconComponents size="sm" />,
    },
  ];
}

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

function AppShellInner({ children, title, subtitle, actions }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollYRef = useRef(0);
  const { data: session } = useSession();
  const t = useT();

  const sidebarSections = useMemo(() => buildSidebarSections(t), [t]);
  const adminItems = useMemo(() => buildAdminItems(t), [t]);

  const visibleAdminItems = useMemo(
    () => (isAdminRole(session?.user?.role) ? adminItems : undefined),
    [adminItems, session?.user?.role],
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

  useEffect(() => {
    if (!mobileOpen) return;

    scrollYRef.current = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollYRef.current}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      style.overflow = previous.overflow;

      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo({ top: scrollYRef.current, left: 0, behavior: "auto" });
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Dimmer open={mobileOpen} onClose={() => setMobileOpen(false)} className="lg:hidden" />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-dvh overflow-hidden transition-transform duration-300 lg:translate-x-0",
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

export function AppShell(props: AppShellProps) {
  return <AppShellInner {...props} />;
}
