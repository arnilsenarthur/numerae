"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SelectOption } from "@/components/ui/select";
import {
  buildCountrySelectOptions,
  buildCurrencySelectOptions,
  buildInstitutionSelectOptions,
  type SerializedCountry,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import { fetchJson } from "@/lib/fetch-json";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import { toLegacyCnpjShape } from "@/lib/company-serializer";
import type { SavedCnpj } from "@/types/user-cnpj";
import type { SavedCompany } from "@/types/user-company";

export const TAX_REGIME_OPTIONS: SelectOption[] = [
  { value: "simples", label: "Simples Nacional" },
  { value: "presumido", label: "Lucro Presumido" },
  { value: "manual", label: "Manual" },
];

export type CatalogData = {
  currencyOptions: SelectOption[];
  institutionOptions: SelectOption[];
  taxRegimeOptions: SelectOption[];
  companyOptions: SelectOption[];
  cnpjOptions: SelectOption[];
  companies: SavedCompany[];
  cnpjs: SavedCnpj[];
  currencies: SerializedCurrency[];
  institutions: SerializedInstitution[];
  countries: SerializedCountry[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const FALLBACK_CURRENCY_OPTIONS: SelectOption[] = [
  { value: "USD", label: "USD — Dólar" },
  { value: "BRL", label: "BRL — Real" },
  { value: "EUR", label: "EUR — Euro" },
];

const FALLBACK_INSTITUTION_OPTIONS: SelectOption[] = [
  { value: "inst_wise", label: "Wise" },
  { value: "inst_inter", label: "Banco Inter" },
  { value: "inst_btg", label: "BTG Pactual" },
];

function buildCompanyOptions(companies: SavedCompany[]): SelectOption[] {
  return companies.map((company) => ({
    key: company.id,
    value: company.id,
    label: company.label,
    description: `${company.countryCode} · ${company.taxRate.toLocaleString("pt-BR")}%`,
  }));
}

export function useCatalog(): CatalogData {
  const [currencies, setCurrencies] = useState<SerializedCurrency[]>([]);
  const [institutions, setInstitutions] = useState<SerializedInstitution[]>([]);
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [catalogRes, companiesRes] = await Promise.all([
      fetchJson<{
        currencies?: SerializedCurrency[];
        institutions?: SerializedInstitution[];
        countries?: SerializedCountry[];
        error?: string;
      }>("/api/catalog"),
      fetchJson<{ companies?: SavedCompany[]; error?: string }>("/api/companies"),
    ]);

    setLoading(false);

    if (!catalogRes.response.ok) {
      setError(catalogRes.data?.error ?? "Erro ao carregar catálogo.");
      return;
    }

    setCurrencies(catalogRes.data?.currencies ?? []);
    setInstitutions(catalogRes.data?.institutions ?? []);
    setCountries(catalogRes.data?.countries ?? []);
    setCompanies(companiesRes.response.ok ? (companiesRes.data?.companies ?? []) : []);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const currencyOptions = useMemo(() => {
    const fromCatalog = buildCurrencySelectOptions(currencies);
    return fromCatalog.length > 0 ? fromCatalog : FALLBACK_CURRENCY_OPTIONS;
  }, [currencies]);

  const institutionOptions = useMemo(() => {
    const fromCatalog = buildInstitutionSelectOptions(institutions);
    return fromCatalog.length > 0 ? fromCatalog : FALLBACK_INSTITUTION_OPTIONS;
  }, [institutions]);

  const companyOptions = useMemo(() => buildCompanyOptions(companies), [companies]);
  const cnpjs = useMemo(() => companies.map(toLegacyCnpjShape), [companies]);

  return {
    currencyOptions,
    institutionOptions,
    taxRegimeOptions: TAX_REGIME_OPTIONS,
    companyOptions,
    cnpjOptions: companyOptions,
    companies,
    cnpjs,
    currencies,
    institutions,
    countries,
    loading,
    error,
    reload,
  };
}

export { buildCountrySelectOptions };
