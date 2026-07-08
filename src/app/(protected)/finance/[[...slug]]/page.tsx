import { redirect } from "next/navigation";
import { FinanceApp } from "@/modules/finance/components/finance-app";
import { resolveTabSlug } from "@/lib/app-routes";

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const { view } = await searchParams;

  if (view === "recurring") {
    redirect("/finance/recurring");
  }

  const initialTab = slug?.[0] ? resolveTabSlug("finance", slug[0]) : null;
  return <FinanceApp initialTab={initialTab} />;
}
