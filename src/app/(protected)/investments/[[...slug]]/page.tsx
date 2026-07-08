import { redirect } from "next/navigation";
import { InvestmentsApp } from "@/modules/investments/components/investments-app";
import { INVESTMENT_TABS, marketKindPath, resolveTabSlug } from "@/lib/app-routes";

export default async function InvestmentsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  if (slug?.[0] === "market" || slug?.[0] === "mercado") {
    redirect(marketKindPath());
  }

  if (slug?.[0] === INVESTMENT_TABS.positions && slug[1]) {
    return <InvestmentsApp initialTab={INVESTMENT_TABS.positions} positionId={slug[1]} />;
  }

  const initialTab = slug?.[0] ? resolveTabSlug("investments", slug[0]) : null;
  return <InvestmentsApp initialTab={initialTab} />;
}
