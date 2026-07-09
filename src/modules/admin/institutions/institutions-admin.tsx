"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SmartTable, SmartTableModalFields } from "@/components/ui/smart-table";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryFilter } from "@/hooks/use-url-query-state";
import { useT } from "@/i18n/locale-provider";
import { translateInstitutionType } from "@/i18n/labels";
import {
  buildCountrySelectOptions,
  countryNameMap,
  type SerializedCountry,
} from "@/lib/catalog-serializer";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import { buildInstitutionColumns } from "./institution-columns";
import {
  applyInstitutionFormField,
  emptyInstitutionForm,
  institutionFormPayload,
  type InstitutionForm,
} from "./institution-form";

export function InstitutionsAdmin() {
  const t = useT();
  const router = useRouter();
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [institutions, setInstitutions] = useState<SerializedInstitution[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<InstitutionForm>(emptyInstitutionForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useUrlQueryFilter({ key: "country", defaultValue: "" });

  const countryFilterOptions = useMemo(
    () => buildCountrySelectOptions(countries, true),
    [countries],
  );
  const countryFormOptions = useMemo(() => buildCountrySelectOptions(countries), [countries]);
  const countryNames = useMemo(() => countryNameMap(countries), [countries]);
  const resolveCountryName = useCallback(
    (code: string) => countryNames.get(code) ?? code,
    [countryNames],
  );

  const loadCountries = useCallback(async () => {
    const { response, data } = await fetchJson<{ countries: SerializedCountry[] }>(
      "/api/admin/countries",
    );
    if (response.ok && data?.countries) setCountries(data.countries);
  }, []);

  const loadInstitutions = useCallback(async (country?: string) => {
    setLoading(true);
    setError(null);

    try {
      const query = country ? `?countryCode=${encodeURIComponent(country)}` : "";
      const { response, data } = await fetchJson<{
        institutions: SerializedInstitution[];
        error?: string;
      }>(`/api/admin/institutions${query}`);

      if (!response.ok) {
        throw new Error(data?.error ?? t("admin.institutions.errorLoad"));
      }

      if (!data?.institutions) {
        throw new Error(t("admin.common.error.invalidResponse"));
      }

      setInstitutions(data.institutions);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const patchInstitution = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setError(null);
      const { response, data } = await fetchJson<{
        institution?: SerializedInstitution;
        error?: string;
      }>(`/api/admin/institutions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = data?.error ?? t("admin.common.error.save");
        setError(message);
        throw new Error(message);
      }

      if (data?.institution) {
        setInstitutions((prev) =>
          prev.map((item) => (item.id === id ? data.institution! : item)),
        );
      } else {
        await loadInstitutions(countryFilter || undefined);
      }
    },
    [countryFilter, loadInstitutions, t],
  );

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    void loadInstitutions(countryFilter || undefined);
  }, [loadInstitutions, countryFilter]);

  function closeCreateModal() {
    setIsCreating(false);
    setForm(emptyInstitutionForm());
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setForm(emptyInstitutionForm());
    setError(null);
  }

  function updateFormField(key: string, value: unknown) {
    setForm((prev) => applyInstitutionFormField(prev, key, value, { autoSlug: true }));
  }

  async function createInstitution() {
    setSaving(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{ institution: SerializedInstitution; error?: string }>(
        "/api/admin/institutions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(institutionFormPayload(form)),
        },
      );

      if (!response.ok || !data?.institution) {
        throw new Error(data?.error ?? t("admin.common.error.create"));
      }

      closeCreateModal();
      router.push(`/admin/institutions/${data.institution.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.create"));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () =>
      buildInstitutionColumns({
        t,
        patchInstitution,
        countryFormOptions,
        resolveCountryName,
      }),
    [countryFormOptions, patchInstitution, resolveCountryName, t],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <p className="text-sm text-emerald-600">{t("admin.common.kicker")}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.institutions.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t("admin.institutions.subtitle")}</p>
      </div>

      {error && !isCreating ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("admin.common.registeredFeminine")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Label>{t("admin.common.filterByCountry")}</Label>
            <Select
              options={countryFilterOptions}
              value={countryFilter}
              onChange={setCountryFilter}
              placeholder={t("admin.common.allCountries")}
            />
          </div>

          {loading ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.common.loading")}</p>
          ) : (
            <SmartTable
              data={institutions}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={8}
              searchPlaceholder={t("admin.institutions.search")}
              searchFilter={(row, query) =>
                [
                  row.name,
                  row.slug,
                  row.countryCode,
                  resolveCountryName(row.countryCode),
                  translateInstitutionType(row.type, t),
                ].some((field) => field.toLowerCase().includes(query))
              }
              onCreate={startCreate}
              createLabel={t("admin.institutions.new")}
              onEdit={(row) => router.push(`/admin/institutions/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={isCreating}
        onClose={closeCreateModal}
        title={t("admin.institutions.new")}
        description={t("admin.institutions.newDescription")}
        size="lg"
        className="max-w-lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={saving}>
              {t("admin.common.cancel")}
            </Button>
            <Button type="button" onClick={() => void createInstitution()} disabled={saving}>
              {saving ? t("admin.common.creating") : t("admin.common.create")}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <SmartTableModalFields
          columns={columns}
          form={form}
          onChange={updateFormField}
          isCreating
          saving={saving}
        />
      </Modal>
    </div>
  );
}
