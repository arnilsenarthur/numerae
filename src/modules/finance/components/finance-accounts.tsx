"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IconBank, IconPlus, IconWallet } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import type { MoneyMapCatalogData } from "@/modules/money-map/hooks/use-money-map-catalog";
import {
  ACCOUNT_KIND_LABELS,
  type FinancialAccountKind,
  type SerializedAccount,
} from "@/types/finance";

const KIND_OPTIONS = Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

type AccountForm = {
  name: string;
  kind: FinancialAccountKind;
  currencyCode: string;
  institutionId: string;
  initialBalance: string;
};

const emptyForm = (): AccountForm => ({
  name: "",
  kind: "CHECKING",
  currencyCode: "BRL",
  institutionId: "",
  initialBalance: "0",
});

export function FinanceAccounts({
  accounts,
  catalog,
  onChanged,
}: {
  accounts: SerializedAccount[];
  catalog: MoneyMapCatalogData;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const institutionOptions = useMemo(
    () => [{ value: "", label: "Sem instituição" }, ...catalog.institutionOptions],
    [catalog.institutionOptions],
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function startEdit(account: SerializedAccount) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      kind: account.kind,
      currencyCode: account.currencyCode,
      institutionId: account.institutionId ?? "",
      initialBalance: String(account.initialBalance),
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        kind: form.kind,
        currencyCode: form.currencyCode,
        institutionId: form.institutionId || null,
        initialBalance: Number(form.initialBalance) || 0,
      };
      const { response, data } = await fetchJson<{ error?: string }>(
        editingId ? `/api/accounts/${editingId}` : "/api/accounts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar conta.");
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    if (!confirm("Excluir esta conta? Todos os lançamentos dela serão apagados.")) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/accounts/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir conta.");
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Contas em qualquer banco, país ou moeda — o saldo considera lançamentos e
          transferências.
        </p>
        <Button type="button" size="sm" onClick={startCreate}>
          <IconPlus size="sm" /> Nova conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<IconWallet className="h-10 w-10 text-zinc-400" />}
          title="Nenhuma conta ainda"
          description="Crie sua primeira conta para registrar entradas e saídas."
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> Criar conta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => startEdit(account)}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <IconBank size="sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {account.institutionName ?? ACCOUNT_KIND_LABELS[account.kind]}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {account.currencyCode}
                </Badge>
              </div>
              <Money value={account.balance} currency={account.currencyCode} size="lg" />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar conta" : "Nova conta"}
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
                Excluir
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex.: Conta Inter, Wise USD…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                options={KIND_OPTIONS}
                value={form.kind}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, kind: value as FinancialAccountKind }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Moeda</Label>
              <Select
                options={catalog.currencyOptions}
                value={form.currencyCode}
                onChange={(value) => setForm((prev) => ({ ...prev, currencyCode: value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Instituição</Label>
            <Select
              options={institutionOptions}
              value={form.institutionId}
              onChange={(value) => setForm((prev) => ({ ...prev, institutionId: value }))}
              placeholder="Sem instituição"
            />
          </div>
          <div className="space-y-1">
            <Label>Saldo inicial</Label>
            <NumberInput
              value={form.initialBalance}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, initialBalance: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
