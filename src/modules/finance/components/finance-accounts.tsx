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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { InstitutionAvatar } from "@/lib/institution-visual";
import { Progress } from "@/components/ui/progress";
import { IconCreditCard, IconPencil, IconPlus, IconTrash, IconWallet } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { validateFormFields } from "@/lib/form-validation";
import { useConfirm } from "@/hooks/use-confirm";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  buildInstitutionSelectOptions,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import {
  type FinancialAccountKind,
  type SerializedAccount,
} from "@/types/finance";

const ACCOUNT_KINDS: FinancialAccountKind[] = [
  "CHECKING",
  "SAVINGS",
  "INVESTMENT",
  "CREDIT_CARD",
  "CASH",
  "OTHER",
];

const FALLBACK_CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
  { value: "EUR", label: "EUR — Euro" },
];

type AccountForm = {
  name: string;
  kind: FinancialAccountKind;
  currencyCode: string;
  institutionId: string;
  initialBalance: string;
  creditLimit: string;
  isDefault: boolean;
};

const emptyForm = (): AccountForm => ({
  name: "",
  kind: "CHECKING",
  currencyCode: "BRL",
  institutionId: "",
  initialBalance: "0",
  creditLimit: "",
  isDefault: false,
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
  const t = useT();
  const { locale } = useLocale();
  const labels = useFinanceLabels();
  const kindOptions = useMemo(
    () => ACCOUNT_KINDS.map((kind) => ({ value: kind, label: labels.accountKindLabel(kind) })),
    [labels],
  );
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
      validationRules.required(t("finance.pages.accounts.nameRequired")),
      validationRules.maxLength(80, t("finance.pages.accounts.nameMaxLength")),
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
    return [{ value: "", label: t("finance.pages.accounts.noInstitution") }, ...opts];
  }, [institutions, t]);

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
    setForm({
      ...emptyForm(),
      isDefault: accounts.length === 0,
    });
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
      creditLimit: account.creditLimit !== null ? String(account.creditLimit) : "",
      isDefault: account.isDefault,
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
      const creditLimit = form.creditLimit.trim()
        ? parseAmount(form.creditLimit)
        : null;
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        currencyCode: form.currencyCode,
        institutionId: form.institutionId || null,
        initialBalance: parseAmount(form.initialBalance),
        creditLimit: creditLimit && creditLimit > 0 ? creditLimit : null,
        isDefault: form.isDefault,
      };
      const { response, data } = await fetchJson<{ error?: string }>(
        editingId ? `/api/accounts/${editingId}` : "/api/accounts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? t("finance.pages.accounts.saveError"));
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("finance.pages.accounts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount(account: SerializedAccount) {
    const ok = await confirm({
      title: t("finance.pages.accounts.deleteTitle"),
      message: t("finance.pages.accounts.deleteMessage", { name: account.name }),
      confirmLabel: t("common.delete"),
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
      if (!response.ok) throw new Error(data?.error ?? t("finance.pages.accounts.deleteError"));
      if (editingId === account.id) setModalOpen(false);
      onChanged();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : t("finance.pages.accounts.deleteError"));
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

  const creditCards = accounts.filter((a) => a.kind === "CREDIT_CARD");
  const otherAccounts = accounts.filter((a) => a.kind !== "CREDIT_CARD");

  function renderAccountCard(account: SerializedAccount) {
    return (
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
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  {account.isDefault ? (
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      {t("finance.pages.accounts.defaultBadge")}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-zinc-500">
                  {account.institutionName ?? labels.accountKindLabel(account.kind)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {account.currencyCode}
            </Badge>
          </div>
          <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <Money value={account.balance} currency={account.currencyCode} size="md" />
            {account.kind === "CREDIT_CARD" && account.creditLimit !== null && account.creditLimit > 0 ? (
              <div className="mt-1.5 space-y-0.5">
                {(() => {
                  const used = Math.abs(Math.min(account.balance, 0));
                  const pct = Math.min((used / account.creditLimit) * 100, 100);
                  const variant = pct >= 80 ? "danger" : pct >= 50 ? "warning" : "success";
                  return (
                    <>
                      <Progress value={pct} max={100} size="xs" variant={variant} />
                      <p className="text-[10px] text-zinc-400">
                        {t("finance.pages.accounts.limitUsage", {
                          pct: pct.toFixed(0),
                          currency: account.currencyCode,
                          limit: account.creditLimit.toLocaleString(locale),
                        })}
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : null}
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
            {t("finance.pages.accounts.edit")}
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
            {t("finance.pages.accounts.delete")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pageError ? <Alert variant="error">{pageError}</Alert> : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<IconWallet className="h-6 w-6" />}
          title={t("finance.pages.accounts.emptyTitle")}
          description={t("finance.pages.accounts.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> {t("finance.pages.app.newAccount")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {creditCards.length > 0 ? (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <IconCreditCard size="sm" /> {t("finance.pages.accounts.creditCards")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {creditCards.map(renderAccountCard)}
              </div>
            </div>
          ) : null}
          {otherAccounts.length > 0 ? (
            <div className="space-y-3">
              {creditCards.length > 0 ? (
                <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("finance.pages.accounts.otherAccounts")}</h3>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {otherAccounts.map(renderAccountCard)}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("finance.pages.accounts.editTitle") : t("finance.pages.accounts.createTitle")}
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
              {t("common.cancel")}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
                <IconTrash size="sm" />
                {t("common.delete")}
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </>
        }
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <div ref={modalFormRef} className="space-y-3">
          <Field
            label={t("finance.pages.accounts.nameLabel")}
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
              placeholder={t("finance.pages.accounts.namePlaceholder")}
              {...fieldControlProps(nameField.validation.state)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("finance.pages.accounts.kindLabel")}</Label>
              <Select
                options={kindOptions}
                value={form.kind}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, kind: value as FinancialAccountKind }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("finance.pages.accounts.currencyLabel")}</Label>
              <Select
                options={currencyOptions}
                value={form.currencyCode}
                onChange={(value) => setForm((prev) => ({ ...prev, currencyCode: value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("finance.pages.accounts.institutionLabel")}</Label>
            <Select
              options={institutionOptions}
              value={form.institutionId}
              onChange={(value) => setForm((prev) => ({ ...prev, institutionId: value }))}
              placeholder={t("finance.pages.accounts.noInstitution")}
            />
          </div>
          <Field
            label={t("finance.pages.accounts.initialBalanceLabel")}
            message={balanceField.validation.message}
            state={balanceField.validation.state}
            hint={t("finance.pages.accounts.initialBalanceHint")}
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
          {form.kind === "CREDIT_CARD" ? (
            <Field label={t("finance.pages.accounts.creditLimitLabel")} hint={t("finance.pages.accounts.creditLimitHint")}>
              <NumberInput
                value={form.creditLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))}
                placeholder="0,00"
              />
            </Field>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">{t("finance.pages.accounts.defaultAccountTitle")}</p>
              <p className="text-xs text-zinc-500">{t("finance.pages.accounts.defaultAccountHint")}</p>
            </div>
            <Switch
              checked={form.isDefault}
              disabled={saving}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isDefault: event.target.checked }))
              }
            />
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
