import { Suspense } from "react";
import { InstitutionDetail } from "@/modules/admin/institutions/institution-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInstitutionDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-zinc-500">Carregando...</p>}>
      <InstitutionDetail institutionId={id} />
    </Suspense>
  );
}
