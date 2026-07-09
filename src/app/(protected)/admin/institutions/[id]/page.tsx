import { Suspense } from "react";
import { AdminLoadingFallback } from "@/components/admin/admin-loading-fallback";
import { InstitutionDetail } from "@/modules/admin/institutions/institution-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInstitutionDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <InstitutionDetail institutionId={id} />
    </Suspense>
  );
}
