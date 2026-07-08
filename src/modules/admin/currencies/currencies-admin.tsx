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
import { useConfirm } from "@/hooks/use-confirm";
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
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [currencies, setCurrencies] = useState<SerializedCurrency[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
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
        throw new Error(data?.error ?? "Erro ao carregar moedas.");
      }
      setCurrencies(data.currencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        const message = (data?.error ?? "Erro ao salvar.") + details;
        setError(message);
        throw new Error(message);
      }

      if (data?.currency) {
        setCurrencies((prev) => prev.map((item) => (item.id === id ? data.currency! : item)));
      } else {
        await loadCurrencies(countryFilter || undefined);
      }
    },
    [countryFilter, loadCurrencies],
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
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar.");
      closeModal();
      await loadCurrencies(countryFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: "Excluir moeda",
      message: "Excluir esta moeda?",
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/currencies/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir.");
      closeModal();
      await loadCurrencies(countryFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<SmartTableColumn<SerializedCurrency>[]>(
    () => [
      {
        id: "code",
        header: "Código",
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
        header: "Nome",
        sortValue: (row) => row.name,
        field: {
          type: "text",
          scope: "both",
          formKey: "name",
          getValue: (row) => row.name,
          placeholder: "Nome da moeda",
          onSave: (row, value) => patchCurrency(row.id, { name: String(value ?? "") }),
        },
      },
      {
        id: "country",
        header: "País",
        sortValue: (row) => row.countryName ?? row.countryCode,
        field: {
          type: "select",
          scope: "both",
          formKey: "countryCode",
          modalLabel: "País",
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
        header: "Símbolo",
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
        header: "Ativa",
        sortValue: (row) => (row.active ? 1 : 0),
        align: "center",
        field: {
          type: "boolean",
          scope: "both",
          formKey: "active",
          modalLabel: "Ativa",
          getValue: (row) => row.active,
          hint: "Ativa",
          onSave: (row, value) => patchCurrency(row.id, { active: Boolean(value) }),
        },
      },
    ],
    [countryFormOptions, patchCurrency],
  );

  const modalOpen = isCreating || !!editingId;

  const editingCurrency = useMemo(
    () => (editingId ? currencies.find((item) => item.id === editingId) ?? null : null),
    [currencies, editingId],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Moedas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Edite na tabela ou use Editar para o formulário completo. Taxa USD: amarelo = ok, vermelho = expirada (1h).
          </p>
        </div>
      </div>

      {error && !modalOpen ? (
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
              options={countryOptions}
              value={countryFilter}
              onChange={setCountryFilter}
              placeholder="Todos os países"
            />
          </div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando...</p>
          ) : (
            <SmartTable
              data={currencies}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder="Buscar moedas…"
              searchFilter={(row, query) =>
                [row.code, row.name, row.countryCode, row.countryName ?? ""].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={startCreate}
              createLabel="Nova moeda"
              onEdit={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isCreating ? "Nova moeda" : `Editar — ${form.code}`}
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            {!isCreating ? (
              <Button type="button" variant="danger" onClick={() => void remove()} disabled={saving}>
                <IconTrash size="sm" />
                Excluir
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando..." : isCreating ? "Criar" : "Salvar"}
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
