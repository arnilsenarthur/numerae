"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SmartTable, SmartTableModalFields } from "@/components/ui/smart-table";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import { useLocale, useT } from "@/i18n/locale-provider";
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
  const t = useT();
  const { locale } = useLocale();
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
        throw new Error(data?.error ?? t("admin.institutions.exchangeRates.errorLoad"));
      }

      setRates(data?.exchangeRates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.institutions.exchangeRates.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [institutionId, t]);

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
        const message = data?.error ?? t("admin.institutions.exchangeRates.errorSave");
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
    [institutionId, loadRates, t],
  );

  const columns = useMemo(
    () => buildExchangeRateColumns({ t, locale, patchRate, currencyOptions }),
    [currencyOptions, locale, patchRate, t],
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
        throw new Error(data?.error ?? t("admin.institutions.exchangeRates.errorCreate"));
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
      setError(err instanceof Error ? err.message : t("admin.institutions.exchangeRates.errorCreate"));
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
      title: t("admin.institutions.exchangeRates.confirmDeleteTitle"),
      message: t("admin.institutions.exchangeRates.confirmDeleteMessage", {
        from: rate.fromCurrency,
        to: rate.toCurrency,
      }),
      confirmLabel: t("admin.common.delete"),
      tone: "error",
    });
    if (!ok) return;

    setError(null);
    const { response, data } = await fetchJson<{ ok?: boolean; error?: string }>(
      `/api/admin/institutions/${institutionId}/exchange-rates/${rate.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      setError(data?.error ?? t("admin.institutions.exchangeRates.errorDelete"));
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
          <CardTitle className="text-base">{t("admin.institutions.exchangeRates.title")}</CardTitle>
          <p className="text-sm text-zinc-500">{t("admin.institutions.exchangeRates.subtitle")}</p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">
              {t("admin.institutions.exchangeRates.loading")}
            </p>
          ) : (
            <SmartTable
              data={rates}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder={t("admin.institutions.exchangeRates.search")}
              searchFilter={(row, query) =>
                [row.fromCurrency, row.toCurrency, row.notes ?? ""].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={() => {
                setCreateForm(emptyExchangeRateForm());
                setCreateOpen(true);
              }}
              createLabel={t("admin.institutions.exchangeRates.new")}
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
        title={t("admin.institutions.exchangeRates.newTitle")}
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
              {t("admin.common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void createRate()}
              disabled={creating || !createForm.rate}
            >
              {creating ? t("admin.common.creating") : t("admin.institutions.exchangeRates.createPair")}
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
            ? t("admin.common.editTitle", {
                name: `${editRate.fromCurrency} → ${editRate.toCurrency}`,
              })
            : t("admin.institutions.exchangeRates.edit")
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
              {t("admin.common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => editRate && void deleteRate(editRate)}
              disabled={savingEdit}
            >
              <IconTrash size="sm" />
              {t("admin.common.delete")}
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditRate()}
              disabled={savingEdit || !editForm?.rate}
            >
              {savingEdit ? t("admin.common.saving") : t("admin.common.save")}
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
