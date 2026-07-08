"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SmartTable, SmartTableModalFields } from "@/components/ui/smart-table";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import {
  buildCurrencySelectOptions,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import type { SerializedExchangeRate } from "@/lib/institution-serializer";
import {
  applyExchangeRateFormField,
  buildExchangeRateColumns,
  createExchangeRatePayload,
  editExchangeRatePayload,
  emptyExchangeRateForm,
  exchangeRateToForm,
  type ExchangeRateForm,
} from "./exchange-rate-columns";

export function InstitutionExchangeRates({
  institutionId,
  currencies,
}: {
  institutionId: string;
  currencies: SerializedCurrency[];
}) {
  const [rates, setRates] = useState<SerializedExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ExchangeRateForm>(emptyExchangeRateForm());
  const [creating, setCreating] = useState(false);
  const [editRate, setEditRate] = useState<SerializedExchangeRate | null>(null);
  const [editForm, setEditForm] = useState<ExchangeRateForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const currencyOptions = useMemo(
    () => buildCurrencySelectOptions(currencies),
    [currencies],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        exchangeRates: SerializedExchangeRate[];
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/exchange-rates`);

      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao carregar taxas.");
      }

      setRates(data?.exchangeRates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar taxas.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const patchRate = useCallback(
    async (rateId: string, body: Record<string, unknown>) => {
      setError(null);
      const { response, data } = await fetchJson<{
        exchangeRate?: SerializedExchangeRate;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/exchange-rates/${rateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = data?.error ?? "Erro ao salvar taxa.";
        setError(message);
        throw new Error(message);
      }

      if (data?.exchangeRate) {
        setRates((prev) =>
          prev.map((item) => (item.id === rateId ? data.exchangeRate! : item)),
        );
      } else {
        await loadRates();
      }
    },
    [institutionId, loadRates],
  );

  const columns = useMemo(
    () => buildExchangeRateColumns({ patchRate, currencyOptions }),
    [currencyOptions, patchRate],
  );

  async function createRate() {
    setCreating(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        exchangeRate?: SerializedExchangeRate;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/exchange-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createExchangeRatePayload(createForm)),
      });

      if (!response.ok || !data?.exchangeRate) {
        throw new Error(data?.error ?? "Erro ao criar taxa.");
      }

      setRates((prev) =>
        [...prev, data.exchangeRate!].sort((a, b) =>
          a.fromCurrency.localeCompare(b.fromCurrency) ||
          a.toCurrency.localeCompare(b.toCurrency),
        ),
      );
      setCreateOpen(false);
      setCreateForm(emptyExchangeRateForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar taxa.");
    } finally {
      setCreating(false);
    }
  }

  async function saveEditRate() {
    if (!editRate || !editForm) return;

    setSavingEdit(true);
    setError(null);

    try {
      await patchRate(editRate.id, editExchangeRatePayload(editForm));
      setEditRate(null);
      setEditForm(null);
    } catch {
      // error handled in patchRate
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteRate(rate: SerializedExchangeRate) {
    const ok = await confirm({
      title: "Excluir par de câmbio",
      message: `Excluir o par ${rate.fromCurrency} → ${rate.toCurrency}?`,
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;

    setError(null);
    const { response, data } = await fetchJson<{ ok?: boolean; error?: string }>(
      `/api/admin/institutions/${institutionId}/exchange-rates/${rate.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      setError(data?.error ?? "Erro ao excluir taxa.");
      return;
    }

    setRates((prev) => prev.filter((item) => item.id !== rate.id));
    setEditRate(null);
    setEditForm(null);
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pares de câmbio</CardTitle>
          <p className="text-sm text-zinc-500">
            Taxa efetiva = taxa × (1 − spread%). Taxa e spread expiram em 1 hora após salvar.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando taxas...</p>
          ) : (
            <SmartTable
              data={rates}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder="Buscar pares…"
              searchFilter={(row, query) =>
                [row.fromCurrency, row.toCurrency, row.notes ?? ""].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={() => {
                setCreateForm(emptyExchangeRateForm());
                setCreateOpen(true);
              }}
              createLabel="Novo par"
              onEdit={(row) => {
                setEditRate(row);
                setEditForm(exchangeRateToForm(row));
              }}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo par de câmbio"
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void createRate()}
              disabled={creating || !createForm.rate}
            >
              {creating ? "Criando..." : "Criar par"}
            </Button>
          </>
        }
      >
        <SmartTableModalFields
          columns={columns}
          form={createForm}
          isCreating
          saving={creating}
          onChange={(key, value) =>
            setCreateForm((prev) => applyExchangeRateFormField(prev, key, value))
          }
        />
      </Modal>

      <Modal
        open={editRate !== null && editForm !== null}
        onClose={() => {
          setEditRate(null);
          setEditForm(null);
        }}
        title={
          editRate
            ? `Editar — ${editRate.fromCurrency} → ${editRate.toCurrency}`
            : "Editar par"
        }
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditRate(null);
                setEditForm(null);
              }}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => editRate && void deleteRate(editRate)}
              disabled={savingEdit}
            >
              <IconTrash size="sm" />
              Excluir
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditRate()}
              disabled={savingEdit || !editForm?.rate}
            >
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        {editForm && editRate ? (
          <SmartTableModalFields
            columns={columns}
            form={editForm}
            row={editRate}
            saving={savingEdit}
            excludeIds={["effective", "fromCurrency", "toCurrency"]}
            onChange={(key, value) =>
              setEditForm((prev) =>
                prev ? applyExchangeRateFormField(prev, key, value) : prev,
              )
            }
          />
        ) : null}
      </Modal>
      {dialog}
    </>
  );
}
