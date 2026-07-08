import { CalculatorApp } from "@/modules/calculator/components/calculator-app";
import { CalculatorHome } from "@/modules/calculator/components/calculator-home";
import { resolveTabSlug } from "@/lib/app-routes";

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  if (!slug?.[0]) {
    return <CalculatorHome />;
  }

  const initialTab = resolveTabSlug("calculator", slug[0]);
  return <CalculatorApp initialTab={initialTab} />;
}
