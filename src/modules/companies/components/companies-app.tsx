"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useUrlQueryFilter } from "@/hooks/use-url-query-state";
import { useConfirm } from "@/hooks/use-confirm";
import { CompanyCard } from "@/modules/companies/components/company-card";
import { CompanyFormModal } from "@/modules/companies/components/company-form-modal";
import type { SavedCompany } from "@/types/user-company";
import { companiesPageHeader } from "@/lib/page-meta";
import { useT } from "@/i18n/locale-provider";

export function CompaniesApp() {
  const t = useT();
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [countryFilter, setCountryFilter] = useUrlQueryFilter({ key: "country", defaultValue: "" });
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
      setError(catalogRes.data?.error ?? t("companies.ui.app.loadCountriesError"));
      return;
    }

    if (!companiesRes.response.ok) {
      setError(companiesRes.data?.error ?? t("companies.ui.app.loadError"));
      return;
    }

    setCountries(catalogRes.data?.countries ?? []);
    setCompanies(companiesRes.data?.companies ?? []);
  }, [countryFilter, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleDelete(company: SavedCompany) {
    const ok = await confirm({
      title: t("companies.ui.app.deleteTitle"),
      message: t("companies.ui.app.deleteMessage", { label: company.label }),
      confirmLabel: t("common.remove"),
      tone: "error",
    });
    if (!ok) return;

    setDeletingId(company.id);
    const { response, data } = await fetchJson<{ error?: string }>(`/api/companies/${company.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (!response.ok) {
      setError(data?.error ?? t("companies.ui.app.deleteError"));
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

  const companyCountLabel =
    companies.length === 1
      ? t("companies.ui.app.companyCount", { count: companies.length })
      : t("companies.ui.app.companyCountPlural", { count: companies.length });

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={companiesPageHeader(t)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-xs">
            <Select
              options={countryOptions}
              value={countryFilter}
              placeholder={t("companies.ui.app.allCountries")}
              onChange={setCountryFilter}
              size="sm"
            />
          </div>
          <p className="text-sm text-zinc-500">{companyCountLabel}</p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <IconPlus size="sm" /> {t("companies.ui.app.newCompany")}
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <CardGridSkeleton count={4} />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<IconBuilding className="h-6 w-6" />}
          title={t("companies.ui.app.emptyTitle")}
          description={t("companies.ui.app.emptyDescription")}
        />
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
