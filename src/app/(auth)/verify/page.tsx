import { Suspense } from "react";
import { VerifyForm } from "@/components/auth/verify-form";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-zinc-500">Carregando...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
