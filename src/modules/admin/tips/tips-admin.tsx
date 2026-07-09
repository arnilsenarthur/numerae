"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import {
  TIP_CATEGORY_OPTIONS,
  tipCategoryLabel,
  type SerializedTip,
  type TipCategory,
} from "@/types/tips";

type TipForm = {
  quote: string;
  author: string;
  category: TipCategory;
  sourceUrl: string;
  sourceLabel: string;
  active: boolean;
};

const emptyForm = (): TipForm => ({
  quote: "",
  author: "",
  category: "general",
  sourceUrl: "",
  sourceLabel: "",
  active: true,
});

export function TipsAdmin() {
  const [tips, setTips] = useState<SerializedTip[]>([]);
  const [form, setForm] = useState<TipForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{ tips: SerializedTip[]; error?: string }>(
        "/api/admin/tips",
      );
      if (!response.ok || !data?.tips) {
        throw new Error(data?.error ?? "Erro ao carregar dicas.");
      }
      setTips(data.tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  function startEdit(tip: SerializedTip) {
    setIsCreating(false);
    setEditingId(tip.id);
    setForm({
      quote: tip.quote,
      author: tip.author,
      category: tip.category,
      sourceUrl: tip.sourceUrl ?? "",
      sourceLabel: tip.sourceLabel ?? "",
      active: tip.active,
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        quote: form.quote.trim(),
        author: form.author.trim(),
        category: form.category,
        sourceUrl: form.sourceUrl.trim(),
        sourceLabel: form.sourceLabel.trim(),
        active: form.active,
      };

      const { response, data } = await fetchJson<{ error?: string }>(
        isCreating ? "/api/admin/tips" : `/api/admin/tips/${editingId}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar.");
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: "Excluir dica",
      message: "Remover esta dica permanentemente?",
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/tips/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir.");
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<DataTableColumn<SerializedTip>[]>(
    () => [
      {
        id: "quote",
        header: "Dica",
        sortValue: (row) => row.quote,
        cell: (row) => (
          <span className="line-clamp-2 max-w-md text-sm">{row.quote}</span>
        ),
      },
      {
        id: "author",
        header: "Autor",
        sortValue: (row) => row.author,
        cell: (row) => <span className="text-sm font-medium">{row.author}</span>,
      },
      {
        id: "category",
        header: "Categoria",
        sortValue: (row) => tipCategoryLabel(row.category),
        cell: (row) => (
          <Badge variant="outline">{tipCategoryLabel(row.category)}</Badge>
        ),
      },
      {
        id: "source",
        header: "Fonte",
        sortValue: (row) => row.sourceLabel ?? "",
        cell: (row) => (
          <span className="line-clamp-1 max-w-[12rem] text-sm text-zinc-500">
            {row.sourceLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "active",
        header: "Status",
        sortValue: (row) => (row.active ? 1 : 0),
        cell: (row) => (
          <Badge variant={row.active ? "success" : "default"}>
            {row.active ? "Ativa" : "Inativa"}
          </Badge>
        ),
      },
    ],
    [],
  );

  const modalOpen = isCreating || editingId !== null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dicas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Frases educativas com link para a fonte (artigo, vídeo com minutagem ou página oficial).
        </p>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Cadastradas</CardTitle>
          <Button type="button" size="sm" onClick={startCreate}>
            <IconPlus size="sm" />
            Nova dica
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando...</p>
          ) : (
            <DataTable
              data={tips}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchable
              searchPlaceholder="Buscar dicas…"
              searchFilter={(row, query) => {
                const q = query.toLowerCase();
                return [row.quote, row.author, tipCategoryLabel(row.category)].some((field) =>
                  field.toLowerCase().includes(q),
                );
              }}
              emptyMessage="Nenhuma dica cadastrada."
              onRowClick={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isCreating ? "Nova dica" : "Editar dica"}
        size="lg"
        className="max-w-lg"
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
              {saving ? "Salvando…" : isCreating ? "Criar" : "Salvar"}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tip-quote">Dica</Label>
            <textarea
              id="tip-quote"
              value={form.quote}
              onChange={(event) => setForm((prev) => ({ ...prev, quote: event.target.value }))}
              rows={4}
              maxLength={500}
              placeholder="Frase curta sobre economia, impostos ou investimentos…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="text-xs text-zinc-400">{form.quote.length}/500</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-author">Autor</Label>
            <Input
              id="tip-author"
              value={form.author}
              onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
              placeholder="Ex.: Raul Sardinha"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              options={TIP_CATEGORY_OPTIONS}
              value={form.category}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, category: value as TipCategory }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-source-url">URL da fonte</Label>
            <Input
              id="tip-source-url"
              type="url"
              value={form.sourceUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
              placeholder="https://… (use &t= segundos em vídeos do YouTube)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-source-label">Descrição da fonte</Label>
            <Input
              id="tip-source-label"
              value={form.sourceLabel}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceLabel: event.target.value }))}
              placeholder="Ex.: Receita Federal — Isenções em bolsa"
            />
          </div>
          <Switch
            id="tip-active"
            label="Dica ativa (visível para usuários)"
            checked={form.active}
            disabled={saving}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          />
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
