"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { IconBuilding, IconPlus } from "@/components/ui/icons";
import { getCountryFlagUrl } from "@/lib/country-flags";
import {
  buildCountrySelectOptions,
  countryNameMap,
  type SerializedCountry,
} from "@/lib/catalog-serializer";
import { formatCnpj } from "@/lib/cnpj";
import { fetchJson } from "@/lib/fetch-json";
import { CompanyFormModal } from "@/modules/companies/components/company-form-modal";
import { registrationMetaForCountry } from "@/modules/companies/lib/registration";
import type { SavedCompany } from "@/types/user-company";

function formatRegistration(company: SavedCompany) {
  if (company.registrationKind === "CNPJ") {
    return formatCnpj(company.registrationId);
  }
  return company.registrationId;
}

export function CompaniesApp() {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedCompany | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-600">Perfil fiscal</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Empresas</h2>
          <p className="mt-2 max-w-2xl text-zinc-500">
            Cadastre suas empresas em qualquer país — CNPJ no Brasil, EIN nos EUA, VAT na Europa
            e outros identificadores fiscais. Use nos blocos de imposto e na calculadora.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <IconPlus size="sm" />
          Nova empresa
        </Button>
      </div>

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
        <p className="py-12 text-sm text-zinc-500">Carregando empresas…</p>
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
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => {
            const meta = registrationMetaForCountry(company.countryCode);
            return (
              <Card key={company.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
                    <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCountryFlagUrl(company.countryCode)}
                        alt={company.countryCode}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{company.label}</h3>
                        {company.isDefault ? <Badge variant="success">Padrão</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {countryNames.get(company.countryCode) ?? company.countryCode}
                      </p>
                      {company.legalName ? (
                        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {company.legalName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2 p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{meta.label}</span>
                      <span className="font-mono text-xs">{formatRegistration(company)}</span>
                    </div>
                    {company.activityCode ? (
                      <div className="text-xs text-zinc-500">
                        {company.activityCode}
                        {company.activityDescription ? ` — ${company.activityDescription}` : ""}
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">Alíquota</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {company.taxRate.toLocaleString("pt-BR")}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">Regime</span>
                      <span className="capitalize">{company.taxRegime}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(company)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={deletingId === company.id}
                      onClick={() => void handleDelete(company)}
                    >
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CompanyFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        countries={countries}
        initial={editing}
        onSaved={() => void loadData()}
      />
    </div>
  );
}
