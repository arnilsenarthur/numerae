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
import {
  buildCountrySelectOptions,
  countryNameMap,
  type SerializedCountry,
} from "@/lib/catalog-serializer";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import { buildInstitutionColumns, institutionTypeLabel } from "./institution-columns";
import {
  applyInstitutionFormField,
  emptyInstitutionForm,
  institutionFormPayload,
  type InstitutionForm,
} from "./institution-form";

export function InstitutionsAdmin() {
  const router = useRouter();
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [institutions, setInstitutions] = useState<SerializedInstitution[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<InstitutionForm>(emptyInstitutionForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState("");

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
        throw new Error(data?.error ?? "Erro ao carregar instituições.");
      }

      if (!data?.institutions) {
        throw new Error("Resposta inválida do servidor.");
      }

      setInstitutions(data.institutions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        const message = data?.error ?? "Erro ao salvar.";
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
    [countryFilter, loadInstitutions],
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
        throw new Error(data?.error ?? "Erro ao criar.");
      }

      closeCreateModal();
      router.push(`/admin/institutions/${data.institution.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () =>
      buildInstitutionColumns({
        patchInstitution,
        countryFormOptions,
        resolveCountryName,
      }),
    [countryFormOptions, patchInstitution, resolveCountryName],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <p className="text-sm text-emerald-600">Admin</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Instituições</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bancos, fintechs, corretoras e remessadoras.
        </p>
      </div>

      {error && !isCreating ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Label>Filtrar por país</Label>
            <Select
              options={countryFilterOptions}
              value={countryFilter}
              onChange={setCountryFilter}
              placeholder="Todos os países"
            />
          </div>

          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando...</p>
          ) : (
            <SmartTable
              data={institutions}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={8}
              searchPlaceholder="Buscar instituições…"
              searchFilter={(row, query) =>
                [
                  row.name,
                  row.slug,
                  row.countryCode,
                  resolveCountryName(row.countryCode),
                  institutionTypeLabel(row.type),
                ].some((field) => field.toLowerCase().includes(query))
              }
              onCreate={startCreate}
              createLabel="Nova instituição"
              onEdit={(row) => router.push(`/admin/institutions/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={isCreating}
        onClose={closeCreateModal}
        title="Nova instituição"
        description="Cadastre uma banca, fintech ou remessadora."
        size="lg"
        className="max-w-lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void createInstitution()} disabled={saving}>
              {saving ? "Criando..." : "Criar"}
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
