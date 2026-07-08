"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartTableModalFields as SmartForm } from "@/components/ui/smart-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import {
  buildCountrySelectOptions,
  countryNameMap,
  type SerializedCountry,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import { buildInstitutionColumns } from "./institution-columns";
import { InstitutionExchangeRates } from "./institution-exchange-rates";
import { InstitutionProducts } from "./institution-products";
import {
  applyInstitutionFormField,
  institutionFormPayload,
  institutionToForm,
  type InstitutionForm,
} from "./institution-form";

type DetailTab = "general" | "exchange" | "products";

function parseDetailTab(value: string | null): DetailTab {
  if (value === "exchange" || value === "products") {
    return value;
  }
  return "general";
}

export function InstitutionDetail({ institutionId }: { institutionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [currencies, setCurrencies] = useState<SerializedCurrency[]>([]);
  const [institution, setInstitution] = useState<SerializedInstitution | null>(null);
  const [form, setForm] = useState<InstitutionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const initialTab: DetailTab = parseDetailTab(searchParams.get("tab"));

  const countryFormOptions = useMemo(() => buildCountrySelectOptions(countries), [countries]);
  const countryNames = useMemo(() => countryNameMap(countries), [countries]);
  const resolveCountryName = useCallback(
    (code: string) => countryNames.get(code) ?? code,
    [countryNames],
  );

  const loadCatalog = useCallback(async () => {
    const [countriesRes, currenciesRes] = await Promise.all([
      fetchJson<{ countries: SerializedCountry[] }>("/api/admin/countries"),
      fetchJson<{ currencies: SerializedCurrency[] }>("/api/admin/currencies"),
    ]);

    if (countriesRes.response.ok && countriesRes.data?.countries) {
      setCountries(countriesRes.data.countries);
    }

    if (currenciesRes.response.ok && currenciesRes.data?.currencies) {
      setCurrencies(currenciesRes.data.currencies);
    }
  }, []);

  const loadInstitution = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        institution?: SerializedInstitution;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}`);

      if (!response.ok || !data?.institution) {
        throw new Error(data?.error ?? "Instituição não encontrada.");
      }

      setInstitution(data.institution);
      setForm(institutionToForm(data.institution));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadCatalog();
    void loadInstitution();
  }, [loadCatalog, loadInstitution]);

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
        setInstitution(data.institution);
        setForm(institutionToForm(data.institution));
      }
    },
    [],
  );

  const columns = useMemo(
    () =>
      buildInstitutionColumns({
        patchInstitution,
        countryFormOptions,
        resolveCountryName,
      }),
    [countryFormOptions, patchInstitution, resolveCountryName],
  );

  function updateFormField(key: string, value: unknown) {
    setForm((prev) =>
      prev ? applyInstitutionFormField(prev, key, value) : prev,
    );
  }

  async function saveInstitution() {
    if (!form) return;

    setSaving(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        institution?: SerializedInstitution;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(institutionFormPayload(form)),
      });

      if (!response.ok || !data?.institution) {
        throw new Error(data?.error ?? "Erro ao salvar.");
      }

      setInstitution(data.institution);
      setForm(institutionToForm(data.institution));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInstitution() {
    const ok = await confirm({
      title: "Excluir instituição",
      message: "Excluir esta instituição e todas as taxas de câmbio?",
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;

    setSaving(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{ ok?: boolean; error?: string }>(
        `/api/admin/institutions/${institutionId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao excluir.");
      }

      router.push("/admin/institutions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(value: string) {
    const next = value as DetailTab;
    const base = `/admin/institutions/${institutionId}`;
    router.replace(next === "general" ? base : `${base}?tab=${next}`, { scroll: false });
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Carregando...</p>;
  }

  if (!institution || !form) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-sm text-zinc-500">{error ?? "Instituição não encontrada."}</p>
        <Link
          href="/admin/institutions"
          className="inline-flex rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <header className="space-y-4 border-b border-zinc-100 pb-6 dark:border-zinc-800/80">
        <nav className="-ml-1">
          <Link
            href="/admin/institutions"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            Instituições
          </Link>
        </nav>
        <div className="flex flex-wrap items-start gap-3">
          {institution.brandColor ? (
            <span
              className="mt-1.5 h-4 w-4 shrink-0 rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700"
              style={{ backgroundColor: institution.brandColor }}
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-sm text-emerald-600">Instituição</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {institution.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{institution.slug}</p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Tabs
        key={`${institutionId}-${initialTab}`}
        defaultValue={initialTab}
        onValueChange={handleTabChange}
      >
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="exchange">Câmbio</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 !border-0 !bg-transparent !p-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <SmartForm
                columns={columns}
                form={form}
                onChange={updateFormField}
                row={institution}
                saving={saving}
              />
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 border-t border-zinc-100 dark:border-zinc-900">
              <Button type="button" variant="danger" onClick={() => void deleteInstitution()} disabled={saving}>
                <IconTrash size="sm" />
                Excluir
              </Button>
              <Button type="button" onClick={() => void saveInstitution()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4 !border-0 !bg-transparent !p-0">
          <InstitutionProducts institutionId={institutionId} currencies={currencies} />
        </TabsContent>

        <TabsContent value="exchange" className="mt-4 !border-0 !bg-transparent !p-0">
          <InstitutionExchangeRates institutionId={institutionId} currencies={currencies} />
        </TabsContent>
      </Tabs>
      {dialog}
    </div>
  );
}
