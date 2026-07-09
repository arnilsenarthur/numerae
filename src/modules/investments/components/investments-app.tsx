"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlTab } from "@/hooks/use-url-tab";
import {
  INVESTMENT_DEFAULT_TAB,
  INVESTMENT_TAB_LABELS,
  INVESTMENT_TABS,
  type InvestmentTabSlug,
} from "@/lib/app-routes";
import { investmentPageHeader, investmentPositionPageHeader } from "@/lib/page-meta";
import { InvestmentPlansPanel } from "@/modules/investments/components/investment-plans-panel";
import { PortfolioPanel } from "@/modules/investments/components/portfolio-panel";
import { PositionsPanel } from "@/modules/investments/components/positions-panel";
import type { SerializedInvestmentPosition } from "@/types/market";

const VALID_TABS = Object.values(INVESTMENT_TABS) as InvestmentTabSlug[];

export function InvestmentsApp({
  initialTab,
  positionId,
}: {
  initialTab?: string | null;
  positionId?: string | null;
}) {
  const [detailPosition, setDetailPosition] = useState<SerializedInvestmentPosition | null>(
    null,
  );
  const [tab, setTab] = useUrlTab<InvestmentTabSlug>({
    basePath: "/investments",
    validTabs: VALID_TABS,
    defaultTab: INVESTMENT_DEFAULT_TAB,
    initialTab,
  });

  const page =
    positionId && detailPosition
      ? investmentPositionPageHeader(detailPosition.name)
      : investmentPageHeader(tab);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={page} />

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as InvestmentTabSlug)}
      >
          <TabsList>
          {VALID_TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs">
              {INVESTMENT_TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "positions" ? (
        <PositionsPanel
          positionId={positionId}
          onDetailPositionChange={setDetailPosition}
        />
      ) : tab === "allocation" ? (
        <PortfolioPanel />
      ) : (
        <InvestmentPlansPanel />
      )}
    </div>
  );
}
