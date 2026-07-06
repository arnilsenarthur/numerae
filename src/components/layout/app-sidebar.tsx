"use client";

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

type AppSidebarProps = {
  items: SidebarLinkItem[];
  adminItems?: SidebarLinkItem[];
  footer?: React.ReactNode;
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({
  items,
  adminItems,
  footer,
  onNavigate,
  className,
}: AppSidebarProps) {
  return (
    <Sidebar className={className} onNavigate={onNavigate}>
      <SidebarHeader>
        <SidebarBrand href="/dashboard" logo="N" title="Numerae" />
      </SidebarHeader>

      <SidebarNav>
        <SidebarMenu items={items} groupLabel="Menu" />
        {adminItems?.length ? (
          <SidebarMenu items={adminItems} groupLabel="Admin" />
        ) : null}
      </SidebarNav>

      {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
    </Sidebar>
  );
}
