import { MoneyMapApp } from "@/modules/money-map/components/money-map-app";

type PageProps = { params: Promise<{ id: string }> };

export default async function MoneyMapDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <MoneyMapApp mapId={id} />;
}
