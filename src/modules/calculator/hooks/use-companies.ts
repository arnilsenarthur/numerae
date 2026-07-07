"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { SavedCompany } from "@/types/user-company";

export function useCompanies() {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ companies?: SavedCompany[] }>("/api/companies")
      .then(({ response, data }) => {
        if (response.ok) setCompanies(data?.companies ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { companies, loading };
}
