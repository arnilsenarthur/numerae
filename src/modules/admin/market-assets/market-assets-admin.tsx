"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  SmartTable,
  SmartTableModalFields,
  type SmartTableColumn,
} from "@/components/ui/smart-table";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryFilter } from "@/hooks/use-url-query-state";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n/locale-provider";
import { translateMarketAssetKind } from "@/i18n/labels";
import { DEFAULT_SPOILABLE_TTL_SECONDS } from "@/lib/spoilable-field";
import {
  type MarketAssetKind,
  type SerializedMarketAsset,
} from "@/types/market";

const MARKET_ASSET_KINDS: MarketAssetKind[] = [
  "STOCK",
  "ETF",
  "FII",
  "CRYPTO",
  "INDEX",
  "COMMODITY",
];

type AssetForm = {
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  exchange: string;
  currencyCode: string;
  countryCode: string;
  active: boolean;
};

const emptyForm = (): AssetForm => ({
  symbol: "",
  name: "",
  kind: "STOCK",
  exchange: "",
  currencyCode: "USD",
  countryCode: "",
  active: true,
});

export function MarketAssetsAdmin() {
  const t = useT();
  const kindOptions = useMemo(
    () =>
      MARKET_ASSET_KINDS.map((value) => ({
        value,
        label: translateMarketAssetKind(value, t),
      })),
    [t],
  );
  const kindFilterOptions = useMemo(
    () => [{ value: "", label: t("admin.common.allTypes") }, ...kindOptions],
    [kindOptions, t],
  );

  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [kindFilter, setKindFilter] = useUrlQueryFilter({ key: "kind", defaultValue: "" });
  const [form, setForm] = useState<AssetForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const loadAssets = useCallback(async (kind?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
      const { response, data } = await fetchJson<{
        assets: SerializedMarketAsset[];
        error?: string;
      }>(`/api/admin/market-assets${query}`);
      if (!response.ok || !data?.assets) {
        throw new Error(data?.error ?? t("admin.marketAssets.errorLoad"));
      }
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAssets(kindFilter || undefined);
  }, [loadAssets, kindFilter]);

  const patchAsset = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setError(null);
      const { response, data } = await fetchJson<{
        asset?: SerializedMarketAsset;
        error?: string;
      }>(`/api/admin/market-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const message = data?.error ?? t("admin.common.error.save");
        setError(message);
        throw new Error(message);
      }
      if (data?.asset) {
        setAssets((prev) => prev.map((item) => (item.id === id ? data.asset! : item)));
      } else {
        await loadAssets(kindFilter || undefined);
      }
    },
    [kindFilter, loadAssets, t],
  );

  function closeModal() {
    setIsCreating(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function startEdit(asset: SerializedMarketAsset) {
    setIsCreating(false);
    setEditingId(asset.id);
    setForm({
      symbol: asset.symbol,
      name: asset.name,
      kind: asset.kind,
      exchange: asset.exchange ?? "",
      currencyCode: asset.currencyCode,
      countryCode: asset.countryCode ?? "",
      active: asset.active,
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        exchange: form.exchange || null,
        countryCode: form.countryCode || null,
      };
      const { response, data } = await fetchJson<{ error?: string }>(
        isCreating ? "/api/admin/market-assets" : `/api/admin/market-assets/${editingId}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.save"));
      closeModal();
      await loadAssets(kindFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.save"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: t("admin.marketAssets.confirmDeleteTitle"),
      message: t("admin.marketAssets.confirmDeleteMessage"),
      confirmLabel: t("admin.common.delete"),
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/market-assets/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.delete"));
      closeModal();
      await loadAssets(kindFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.delete"));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<SmartTableColumn<SerializedMarketAsset>[]>(
    () => [
      {
        id: "symbol",
        header: t("admin.common.columns.symbol"),
        sortValue: (row) => row.symbol,
        field: {
          type: "text",
          scope: "both",
          formKey: "symbol",
          getValue: (row) => row.symbol,
          placeholder: t("admin.marketAssets.placeholders.symbol"),
          onSave: (row, value) =>
            patchAsset(row.id, { symbol: String(value ?? "").toUpperCase() }),
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
          placeholder: t("admin.marketAssets.placeholders.name"),
          onSave: (row, value) => patchAsset(row.id, { name: String(value ?? "") }),
        },
      },
      {
        id: "kind",
        header: t("admin.common.columns.kind"),
        sortValue: (row) => row.kind,
        field: {
          type: "select",
          scope: "both",
          formKey: "kind",
          modalLabel: t("admin.common.columns.kind"),
          getValue: (row) => row.kind,
          options: kindOptions,
          onSave: (row, value) => patchAsset(row.id, { kind: String(value) }),
        },
      },
      {
        id: "price",
        header: t("admin.common.columns.price"),
        sortValue: (row) => row.price ?? 0,
        field: {
          type: "spoilable-number",
          getValue: (row) => row.price,
          getUpdatedAt: (row) => row.priceUpdatedAt,
          getTtlSeconds: (row) => row.priceTtlSeconds || DEFAULT_SPOILABLE_TTL_SECONDS,
          placeholder: "0.00",
          step: "0.01",
          min: 0.000001,
          onSave: (row, value) => patchAsset(row.id, { price: value as number | null }),
        },
      },
      {
        id: "currency",
        header: t("admin.common.columns.currency"),
        sortValue: (row) => row.currencyCode,
        field: {
          type: "text",
          scope: "modal",
          formKey: "currencyCode",
          modalLabel: t("admin.common.columns.currency"),
          getValue: (row) => row.currencyCode,
          placeholder: "USD",
          onSave: (row, value) =>
            patchAsset(row.id, { currencyCode: String(value ?? "").toUpperCase() }),
        },
      },
      {
        id: "exchange",
        header: t("admin.common.columns.exchange"),
        field: {
          type: "text",
          scope: "modal",
          formKey: "exchange",
          modalLabel: t("admin.marketAssets.exchangeLabel"),
          getValue: (row) => row.exchange,
          placeholder: t("admin.marketAssets.placeholders.exchange"),
          onSave: (row, value) => patchAsset(row.id, { exchange: value ? String(value) : null }),
        },
      },
      {
        id: "country",
        header: t("admin.common.columns.country"),
        field: {
          type: "text",
          scope: "modal",
          formKey: "countryCode",
          modalLabel: t("admin.marketAssets.countryCode"),
          getValue: (row) => row.countryCode,
          placeholder: t("admin.marketAssets.placeholders.country"),
          onSave: (row, value) =>
            patchAsset(row.id, {
              countryCode: value ? String(value).toUpperCase() : null,
            }),
        },
      },
      {
        id: "active",
        header: t("admin.common.active"),
        sortValue: (row) => (row.active ? 1 : 0),
        align: "center",
        field: {
          type: "boolean",
          scope: "both",
          formKey: "active",
          modalLabel: t("admin.common.active"),
          getValue: (row) => row.active,
          hint: t("admin.common.active"),
          onSave: (row, value) => patchAsset(row.id, { active: Boolean(value) }),
        },
      },
    ],
    [kindOptions, patchAsset, t],
  );

  const modalOpen = isCreating || !!editingId;
  const editingAsset = useMemo(
    () => (editingId ? assets.find((item) => item.id === editingId) ?? null : null),
    [assets, editingId],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600">{t("admin.common.kicker")}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("admin.marketAssets.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.marketAssets.subtitle")}</p>
        </div>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("admin.common.registered")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Label>{t("admin.common.filterByType")}</Label>
            <Select
              options={kindFilterOptions}
              value={kindFilter}
              onChange={setKindFilter}
              placeholder={t("admin.common.allTypes")}
            />
          </div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.common.loading")}</p>
          ) : (
            <SmartTable
              data={assets}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder={t("admin.marketAssets.search")}
              searchFilter={(row, query) =>
                [row.symbol, row.name, row.exchange ?? "", row.kind].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={startCreate}
              createLabel={t("admin.marketAssets.new")}
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
            ? t("admin.marketAssets.new")
            : t("admin.common.editTitle", { name: form.symbol })
        }
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              {t("admin.common.cancel")}
            </Button>
            {!isCreating ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
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
                (key === "symbol" || key === "currencyCode") && typeof value === "string"
                  ? value.toUpperCase()
                  : value,
            }))
          }
          row={editingAsset}
          isCreating={isCreating}
          saving={saving}
        />
      </Modal>
      {dialog}
    </div>
  );
}
