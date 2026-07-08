"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/panel-skeleton";
import { Select } from "@/components/ui/select";
import { IconBuilding, IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import {
  buildCountrySelectOptions,
  countryNameMap,
  type SerializedCountry,
} from "@/lib/catalog-serializer";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import { CompanyCard } from "@/modules/companies/components/company-card";
import { CompanyFormModal } from "@/modules/companies/components/company-form-modal";
import type { SavedCompany } from "@/types/user-company";
import { companiesPageHeader } from "@/lib/page-meta";

export function CompaniesApp() {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedCompany | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const countryOptions = useMemo(
    () => buildCountrySelectOptions(countries, true),
    [countries],
  );
  const countryNames = useMemo(() => countryNameMap(countries), [countries]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = countryFilter ? `?countryCode=${encodeURIComponent(countryFilter)}` : "";
    const [catalogRes, companiesRes] = await Promise.all([
      fetchJson<{ countries?: SerializedCountry[]; error?: string }>("/api/catalog"),
      fetchJson<{ companies?: SavedCompany[]; error?: string }>(`/api/companies${query}`),
    ]);

    setLoading(false);

    if (!catalogRes.response.ok) {
      setError(catalogRes.data?.error ?? "Erro ao carregar países.");
      return;
    }

    if (!companiesRes.response.ok) {
      setError(companiesRes.data?.error ?? "Erro ao carregar empresas.");
      return;
    }

    setCountries(catalogRes.data?.countries ?? []);
    setCompanies(companiesRes.data?.companies ?? []);
  }, [countryFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleDelete(company: SavedCompany) {
    const ok = await confirm({
      title: "Remover empresa",
      message: `Remover "${company.label}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      tone: "error",
    });
    if (!ok) return;

    setDeletingId(company.id);
    const { response, data } = await fetchJson<{ error?: string }>(`/api/companies/${company.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (!response.ok) {
      setError(data?.error ?? "Erro ao remover empresa.");
      return;
    }

    void loadData();
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(company: SavedCompany) {
    setEditing(company);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        meta={companiesPageHeader}
        actions={
          <Button type="button" onClick={openCreate}>
            <IconPlus size="sm" />
            Nova empresa
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Select
            options={countryOptions}
            value={countryFilter}
            placeholder="Todos os países"
            onChange={setCountryFilter}
          />
        </div>
        <Badge variant="outline">{companies.length} cadastrada(s)</Badge>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <CardGridSkeleton count={4} />
      ) : companies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <IconBuilding className="h-10 w-10 text-zinc-400" />
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Nenhuma empresa ainda</p>
              <p className="mt-1 text-sm text-zinc-500">
                Cadastre sua primeira empresa para simular impostos e PJ no mapa do dinheiro.
              </p>
            </div>
            <Button type="button" onClick={openCreate}>
              Cadastrar empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              countryName={countryNames.get(company.countryCode) ?? company.countryCode}
              deleting={deletingId === company.id}
              onEdit={() => openEdit(company)}
              onDelete={() => void handleDelete(company)}
            />
          ))}
        </div>
      )}

      <CompanyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        countries={countries}
        initial={editing}
        onSaved={() => void loadData()}
      />
      {dialog}
    </div>
  );
}
