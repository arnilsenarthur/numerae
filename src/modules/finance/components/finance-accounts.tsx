"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Alert } from "@/components/ui/alert";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InstitutionAvatar } from "@/lib/institution-visual";
import { IconPencil, IconPlus, IconTrash, IconWallet } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { validateFormFields } from "@/lib/form-validation";
import { useConfirm } from "@/hooks/use-confirm";
import {
  buildInstitutionSelectOptions,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import {
  ACCOUNT_KIND_LABELS,
  type FinancialAccountKind,
  type SerializedAccount,
} from "@/types/finance";

const FALLBACK_CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
  { value: "EUR", label: "EUR — Euro" },
];

const FALLBACK_INSTITUTION_OPTIONS = [{ value: "", label: "Sem instituição" }];

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
  onChanged,
  openCreateSeq = 0,
}: {
  accounts: SerializedAccount[];
  onChanged: () => void;
  openCreateSeq?: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const modalFormRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  // Catalog is loaded lazily — only fetched the first time the modal opens.
  const catalogFetched = useRef(false);
  const [currencies, setCurrencies] = useState<SerializedCurrency[]>([]);
  const [institutions, setInstitutions] = useState<SerializedInstitution[]>([]);

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

  const currencyOptions = useMemo(() => {
    if (currencies.length === 0) return FALLBACK_CURRENCY_OPTIONS;
    return currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
  }, [currencies]);

  const institutionOptions = useMemo(() => {
    const opts = buildInstitutionSelectOptions(institutions);
    return [{ value: "", label: "Sem instituição" }, ...opts];
  }, [institutions]);

  async function ensureCatalogLoaded() {
    if (catalogFetched.current) return;
    catalogFetched.current = true;
    const res = await fetchJson<{
      currencies?: SerializedCurrency[];
      institutions?: SerializedInstitution[];
    }>("/api/catalog");
    if (res.response.ok) {
      setCurrencies(res.data?.currencies ?? []);
      setInstitutions(res.data?.institutions ?? []);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    nameField.reset();
    balanceField.reset();
    setPageError(null);
    setFormError(null);
    void ensureCatalogLoaded();
    setModalOpen(true);
  }

  useEffect(() => {
    if (openCreateSeq > 0) startCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateSeq]);

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
    setPageError(null);
    setFormError(null);
    void ensureCatalogLoaded();
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
    if (!validateFormFields([nameField, balanceField], modalFormRef.current)) return;

    setSaving(true);
    setFormError(null);
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
      setFormError(err instanceof Error ? err.message : "Erro ao salvar conta.");
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
    setPageError(null);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/accounts/${account.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir conta.");
      if (editingId === account.id) setModalOpen(false);
      onChanged();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Erro ao excluir conta.");
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
      {pageError ? <Alert variant="error">{pageError}</Alert> : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<IconWallet className="h-6 w-6" />}
          title="Nenhuma conta ainda"
          description="Crie sua primeira conta para registrar entradas e saídas."
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> Nova conta
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
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <div ref={modalFormRef} className="space-y-3">
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
                options={currencyOptions}
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
