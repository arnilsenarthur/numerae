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
import { useConfirm } from "@/hooks/use-confirm";
import { DEFAULT_SPOILABLE_TTL_SECONDS } from "@/lib/spoilable-field";
import {
  MARKET_ASSET_KIND_LABELS,
  type MarketAssetKind,
  type SerializedMarketAsset,
} from "@/types/market";

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

const KIND_OPTIONS = Object.entries(MARKET_ASSET_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const KIND_FILTER_OPTIONS = [{ value: "", label: "Todos os tipos" }, ...KIND_OPTIONS];

export function MarketAssetsAdmin() {
  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [kindFilter, setKindFilter] = useState("");
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
        throw new Error(data?.error ?? "Erro ao carregar ativos.");
      }
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

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
        const message = data?.error ?? "Erro ao salvar.";
        setError(message);
        throw new Error(message);
      }
      if (data?.asset) {
        setAssets((prev) => prev.map((item) => (item.id === id ? data.asset! : item)));
      } else {
        await loadAssets(kindFilter || undefined);
      }
    },
    [kindFilter, loadAssets],
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
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar.");
      closeModal();
      await loadAssets(kindFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: "Excluir ativo",
      message: "Excluir este ativo? O histórico de cotações será apagado.",
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/market-assets/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir.");
      closeModal();
      await loadAssets(kindFilter || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<SmartTableColumn<SerializedMarketAsset>[]>(
    () => [
      {
        id: "symbol",
        header: "Símbolo",
        sortValue: (row) => row.symbol,
        field: {
          type: "text",
          scope: "both",
          formKey: "symbol",
          getValue: (row) => row.symbol,
          placeholder: "PETR4, AAPL, BTC…",
          onSave: (row, value) =>
            patchAsset(row.id, { symbol: String(value ?? "").toUpperCase() }),
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
          placeholder: "Nome do ativo",
          onSave: (row, value) => patchAsset(row.id, { name: String(value ?? "") }),
        },
      },
      {
        id: "kind",
        header: "Tipo",
        sortValue: (row) => row.kind,
        field: {
          type: "select",
          scope: "both",
          formKey: "kind",
          modalLabel: "Tipo",
          getValue: (row) => row.kind,
          options: KIND_OPTIONS,
          onSave: (row, value) => patchAsset(row.id, { kind: String(value) }),
        },
      },
      {
        id: "price",
        header: "Preço",
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
        header: "Moeda",
        sortValue: (row) => row.currencyCode,
        field: {
          type: "text",
          scope: "modal",
          formKey: "currencyCode",
          modalLabel: "Moeda",
          getValue: (row) => row.currencyCode,
          placeholder: "USD",
          onSave: (row, value) =>
            patchAsset(row.id, { currencyCode: String(value ?? "").toUpperCase() }),
        },
      },
      {
        id: "exchange",
        header: "Bolsa",
        field: {
          type: "text",
          scope: "modal",
          formKey: "exchange",
          modalLabel: "Bolsa / exchange",
          getValue: (row) => row.exchange,
          placeholder: "B3, NASDAQ…",
          onSave: (row, value) => patchAsset(row.id, { exchange: value ? String(value) : null }),
        },
      },
      {
        id: "country",
        header: "País",
        field: {
          type: "text",
          scope: "modal",
          formKey: "countryCode",
          modalLabel: "País (código, ex.: BR)",
          getValue: (row) => row.countryCode,
          placeholder: "BR, US…",
          onSave: (row, value) =>
            patchAsset(row.id, {
              countryCode: value ? String(value).toUpperCase() : null,
            }),
        },
      },
      {
        id: "active",
        header: "Ativo",
        sortValue: (row) => (row.active ? 1 : 0),
        align: "center",
        field: {
          type: "boolean",
          scope: "both",
          formKey: "active",
          modalLabel: "Ativo",
          getValue: (row) => row.active,
          hint: "Ativo",
          onSave: (row, value) => patchAsset(row.id, { active: Boolean(value) }),
        },
      },
    ],
    [patchAsset],
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
          <p className="text-sm text-emerald-600">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Ativos de mercado
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Ações, ETFs, FIIs e cripto acompanhados pelo worker de cotações. Preço: amarelo =
            ok, vermelho = expirado.
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
          <CardTitle className="text-base">Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Label>Filtrar por tipo</Label>
            <Select
              options={KIND_FILTER_OPTIONS}
              value={kindFilter}
              onChange={setKindFilter}
              placeholder="Todos os tipos"
            />
          </div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando...</p>
          ) : (
            <SmartTable
              data={assets}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder="Buscar ativos…"
              searchFilter={(row, query) =>
                [row.symbol, row.name, row.exchange ?? "", row.kind].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={startCreate}
              createLabel="Novo ativo"
              onEdit={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isCreating ? "Novo ativo" : `Editar — ${form.symbol}`}
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            {!isCreating ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
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
