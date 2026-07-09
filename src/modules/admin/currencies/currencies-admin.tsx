"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SmartTable, SmartTableModalFields, type SmartTableColumn } from "@/components/ui/smart-table";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryFilter } from "@/hooks/use-url-query-state";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n/locale-provider";
import {
  buildCountrySelectOptions,
  type SerializedCountry,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import { DEFAULT_USD_RATE_TTL_SECONDS } from "@/lib/spoilable-field";

type CurrencyForm = {
  code: string;
  name: string;
  countryCode: string;
  symbol: string;
  active: boolean;
};

const emptyForm = (countryCode = "BR"): CurrencyForm => ({
  code: "",
  name: "",
  countryCode,
  symbol: "",
  active: true,
});

export function CurrenciesAdmin() {
  const t = useT();
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [currencies, setCurrencies] = useState<SerializedCurrency[]>([]);
  const [countryFilter, setCountryFilter] = useUrlQueryFilter({ key: "country", defaultValue: "" });
  const [form, setForm] = useState<CurrencyForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const countryOptions = useMemo(
    () => buildCountrySelectOptions(countries, true),
    [countries],
  );

  const countryFormOptions = useMemo(
    () => buildCountrySelectOptions(countries),
    [countries],
  );

  const loadCountries = useCallback(async () => {
    const { response, data } = await fetchJson<{ countries: SerializedCountry[] }>(
      "/api/admin/countries",
    );
    if (response.ok && data?.countries) setCountries(data.countries);
  }, []);

  const loadCurrencies = useCallback(async (country?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = country ? `?countryCode=${encodeURIComponent(country)}` : "";
      const { response, data } = await fetchJson<{ currencies: SerializedCurrency[]; error?: string }>(
        `/api/admin/currencies${query}`,
      );
      if (!response.ok || !data?.currencies) {
        throw new Error(data?.error ?? t("admin.currencies.errorLoad"));
      }
      setCurrencies(data.currencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    void loadCurrencies(countryFilter || undefined);
  }, [loadCurrencies, countryFilter]);

  const patchCurrency = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setError(null);
      const { response, data } = await fetchJson<{
        currency?: SerializedCurrency;
        error?: string;
        details?: string;
      }>(`/api/admin/currencies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const details = data?.details ? `: ${data.details}` : "";
        const message = (data?.error ?? t("admin.common.error.save")) + details;
        setError(message);
        throw new Error(message);
      }

      if (data?.currency) {
        setCurrencies((prev) => prev.map((item) => (item.id === id ? data.currency! : item)));
      } else {
        await loadCurrencies(countryFilter || undefined);
      }
    },
    [countryFilter, loadCurrencies, t],
  );

  function closeModal() {
    setIsCreating(false);
    setEditingId(null);
    setForm(emptyForm(countryFilter || "BR"));
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setForm(emptyForm(countryFilter || "BR"));
    setError(null);
  }

  function startEdit(currency: SerializedCurrency) {
    setIsCreating(false);
    setEditingId(currency.id);
    setForm({
      code: currency.code,
      name: currency.name,
      countryCode: currency.countryCode,
      symbol: currency.symbol ?? "",
      active: currency.active,
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, symbol: form.symbol || undefined };
      const { response, data } = await fetchJson<{ error?: string }>(
        isCreating ? "/api/admin/currencies" : `/api/admin/currencies/${editingId}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.save"));
      closeModal();
      await loadCurrencies(countryFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.save"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: t("admin.currencies.confirmDeleteTitle"),
      message: t("admin.currencies.confirmDeleteMessage"),
      confirmLabel: t("admin.common.delete"),
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/currencies/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.delete"));
      closeModal();
      await loadCurrencies(countryFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.delete"));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<SmartTableColumn<SerializedCurrency>[]>(
    () => [
      {
        id: "code",
        header: t("admin.common.columns.code"),
        sortValue: (row) => row.code,
        field: {
          type: "text",
          scope: "both",
          formKey: "code",
          getValue: (row) => row.code,
          placeholder: "USD",
          disabled: (row) => row.code === "USD",
          modalDisabled: ({ isCreating, row }) => !isCreating || row?.code === "USD",
          onSave: (row, value) =>
            patchCurrency(row.id, { code: String(value ?? "").toUpperCase() }),
        },
      },
      {
        id: "name",
        header: t("admin.common.columns.name"),
        sortValue: (row) => row.name,
        field: {
          type: "text",
          scope: "both",
          formKey: "name",
          getValue: (row) => row.name,
          placeholder: t("admin.currencies.currencyName"),
          onSave: (row, value) => patchCurrency(row.id, { name: String(value ?? "") }),
        },
      },
      {
        id: "country",
        header: t("admin.common.columns.country"),
        sortValue: (row) => row.countryName ?? row.countryCode,
        field: {
          type: "select",
          scope: "both",
          formKey: "countryCode",
          modalLabel: t("admin.common.columns.country"),
          getValue: (row) => row.countryCode,
          options: countryFormOptions,
          disabled: (row) => row.code === "USD",
          modalDisabled: ({ row }) => row?.code === "USD",
          onSave: (row, value) => patchCurrency(row.id, { countryCode: String(value) }),
        },
      },
      {
        id: "usdRate",
        header: "USD",
        sortValue: (row) => row.usdRate ?? 0,
        field: {
          type: "spoilable-number",
          getValue: (row) => (row.code === "USD" ? 1 : row.usdRate),
          getUpdatedAt: (row) => row.usdRateUpdatedAt,
          getTtlSeconds: (row) => row.usdRateTtlSeconds || DEFAULT_USD_RATE_TTL_SECONDS,
          placeholder: "0.000000",
          step: "0.000001",
          min: 0.000001,
          disabled: (row) => row.code === "USD",
          onSave: (row, value) => patchCurrency(row.id, { usdRate: value as number | null }),
        },
      },
      {
        id: "symbol",
        header: t("admin.common.columns.symbol"),
        field: {
          type: "text",
          scope: "modal",
          formKey: "symbol",
          getValue: (row) => row.symbol,
          placeholder: "$",
          onSave: (row, value) =>
            patchCurrency(row.id, { symbol: value ? String(value) : null }),
        },
      },
      {
        id: "active",
        header: t("admin.common.activeFeminine"),
        sortValue: (row) => (row.active ? 1 : 0),
        align: "center",
        field: {
          type: "boolean",
          scope: "both",
          formKey: "active",
          modalLabel: t("admin.common.activeFeminine"),
          getValue: (row) => row.active,
          hint: t("admin.common.activeFeminine"),
          onSave: (row, value) => patchCurrency(row.id, { active: Boolean(value) }),
        },
      },
    ],
    [countryFormOptions, patchCurrency, t],
  );

  const modalOpen = isCreating || !!editingId;

  const editingCurrency = useMemo(
    () => (editingId ? currencies.find((item) => item.id === editingId) ?? null : null),
    [currencies, editingId],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600">{t("admin.common.kicker")}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("admin.currencies.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.currencies.subtitle")}</p>
        </div>
      </div>

      {error && !modalOpen ? (
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
              options={countryOptions}
              value={countryFilter}
              onChange={setCountryFilter}
              placeholder={t("admin.common.allCountries")}
            />
          </div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.common.loading")}</p>
          ) : (
            <SmartTable
              data={currencies}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder={t("admin.currencies.search")}
              searchFilter={(row, query) =>
                [row.code, row.name, row.countryCode, row.countryName ?? ""].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={startCreate}
              createLabel={t("admin.currencies.new")}
              onEdit={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          isCreating
            ? t("admin.currencies.new")
            : t("admin.common.editTitle", { name: form.code })
        }
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              {t("admin.common.cancel")}
            </Button>
            {!isCreating ? (
              <Button type="button" variant="danger" onClick={() => void remove()} disabled={saving}>
                <IconTrash size="sm" />
                {t("admin.common.delete")}
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving
                ? t("admin.common.saving")
                : isCreating
                  ? t("admin.common.create")
                  : t("admin.common.save")}
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
          onChange={(key, value) =>
            setForm((prev) => ({
              ...prev,
              [key]:
                key === "code" && typeof value === "string"
                  ? value.toUpperCase()
                  : value,
            }))
          }
          row={editingCurrency}
          isCreating={isCreating}
          saving={saving}
        />
      </Modal>
      {dialog}
    </div>
  );
}
