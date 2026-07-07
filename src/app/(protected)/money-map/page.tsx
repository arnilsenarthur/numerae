import { Suspense } from "react";
import { MoneyMapAppClient } from "./money-map-client";

export default function MoneyMapPage() {
  return (
    <Suspense fallback={<p className="py-12 text-sm text-zinc-500">Carregando…</p>}>
      <MoneyMapAppClient />
    </Suspense>
  );
}
