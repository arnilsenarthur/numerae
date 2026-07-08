"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InstitutionAvatar } from "@/lib/institution-visual";
import { IconPencil, IconPlus, IconTrash, IconWallet } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import type { CatalogData } from "@/hooks/use-catalog";
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
  catalog: CatalogData;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const nameField = useValidatedField(
    [
      validationRules.required("Nome é obrigatório."),
      validationRules.maxLength(80, "Máximo de 80 caracteres."),
    ],
    { required: true, validateMode: "change", showSuccess: false },
  );

  const balanceField = useValidatedField([validationRules.currency()], {
    required: false,
    allowEmpty: true,
    validateMode: ["blur", "submit"],
    showSuccess: false,
  });

  const institutionOptions = useMemo(
    () => [{ value: "", label: "Sem instituição" }, ...catalog.institutionOptions],
    [catalog.institutionOptions],
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    nameField.reset();
    balanceField.reset();
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
    nameField.reset();
    nameField.setValue(account.name);
    balanceField.reset();
    balanceField.setValue(String(account.initialBalance));
    setError(null);
    setModalOpen(true);
  }

  function parseAmount(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const normalized = trimmed.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }

  async function save() {
    nameField.markSubmitted();
    balanceField.markSubmitted();
    if (!nameField.isValid || !balanceField.isValid) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        currencyCode: form.currencyCode,
        institutionId: form.institutionId || null,
        initialBalance: parseAmount(form.initialBalance),
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

  async function removeAccount(account: SerializedAccount) {
    const ok = await confirm({
      title: "Excluir conta",
      message: `Excluir "${account.name}"? Todos os lançamentos desta conta serão apagados.`,
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;

    setDeletingId(account.id);
    setError(null);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/accounts/${account.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir conta.");
      if (editingId === account.id) setModalOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir conta.");
    } finally {
      setDeletingId(null);
    }
  }

  async function remove() {
    if (!editingId) return;
    const account = accounts.find((item) => item.id === editingId);
    if (!account) return;
    await removeAccount(account);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={startCreate}>
          <IconPlus size="sm" /> Nova conta
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

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
            <Card key={account.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <InstitutionAvatar
                      logoUrl={account.institutionLogoUrl}
                      institutionType={account.institutionId ? account.institutionType : null}
                      brandColor={account.institutionBrandColor}
                      size="md"
                    />
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
                <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <Money value={account.balance} currency={account.currencyCode} size="md" />
                </div>
              </CardContent>
              <div className="flex gap-1.5 border-t border-zinc-100 p-2 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => startEdit(account)}
                  disabled={deletingId === account.id}
                >
                  <IconPencil size="xs" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  loading={deletingId === account.id}
                  onClick={() => void removeAccount(account)}
                >
                  <IconTrash size="xs" />
                  Excluir
                </Button>
              </div>
            </Card>
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
                <IconTrash size="sm" />
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
          <Field
            label="Nome"
            message={nameField.validation.message}
            state={nameField.validation.state}
            required
            counter={`${nameField.value.length}/80`}
          >
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                nameField.setValue(name);
                setForm((prev) => ({ ...prev, name }));
              }}
              onBlur={nameField.bind.onBlur}
              placeholder="Ex.: Conta Inter, Wise USD…"
              {...fieldControlProps(nameField.validation.state)}
            />
          </Field>
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
          <Field
            label="Saldo inicial"
            message={balanceField.validation.message}
            state={balanceField.validation.state}
            hint="Pode ser negativo (ex.: cheque especial)."
          >
            <NumberInput
              value={form.initialBalance}
              onChange={(e) => {
                const initialBalance = e.target.value;
                balanceField.setValue(initialBalance);
                setForm((prev) => ({ ...prev, initialBalance }));
              }}
              onBlur={balanceField.bind.onBlur}
              {...fieldControlProps(balanceField.validation.state)}
            />
          </Field>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
