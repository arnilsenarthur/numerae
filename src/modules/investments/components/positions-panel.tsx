"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PositionsPanelSkeleton } from "@/components/ui/panel-skeleton";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { LineChart, DonutChart } from "@/components/ui/chart";
import {
  IconChevronRight,
  IconCoins,
  IconPencil,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconTrendUp,
  IconTrendDown,
} from "@/components/ui/icons";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  investmentCategoryOptions,
  translateInvestmentCategory,
  translateInvestmentEntryKind,
} from "@/i18n/labels";
import { fetchJson } from "@/lib/fetch-json";
import { investmentPositionPath } from "@/lib/app-routes";
import { useConfirm } from "@/hooks/use-confirm";
import { formatMoney } from "@/lib/format-money";
import {
  INVESTMENT_CATEGORY_COLOR_HEX,
  type InvestmentEntryKind,
  type SerializedInvestmentEntry,
  type SerializedInvestmentPosition,
} from "@/types/market";

const ENTRY_KIND_VALUES: InvestmentEntryKind[] = ["DEPOSIT", "WITHDRAWAL", "BALANCE_UPDATE"];

type PositionForm = {
  name: string;
  assetSymbol: string;
  category: string;
  currencyCode: string;
  institution: string;
  currentBalance: string;
  initialDeposit: string;
  initialDepositDate: string;
};

type EntryForm = {
  kind: InvestmentEntryKind;
  amount: string;
  balance: string;
  date: string;
  notes: string;
};

function emptyPositionForm(): PositionForm {
  return {
    name: "",
    assetSymbol: "",
    category: "OTHER",
    currencyCode: "BRL",
    institution: "",
    currentBalance: "0",
    initialDeposit: "",
    initialDepositDate: todayIso(),
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntryForm(): EntryForm {
  return {
    kind: "DEPOSIT",
    amount: "",
    balance: "",
    date: todayIso(),
    notes: "",
  };
}

function formatDateShort(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function ProfitBadge({ value, percent }: { value: number | null; percent: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
    >
      {positive ? <IconTrendUp size="xs" /> : <IconTrendDown size="xs" />}
      {positive ? "+" : ""}
      {percent !== null ? `${percent.toFixed(1)}%` : ""}
    </span>
  );
}

// ─── Position Detail View ────────────────────────────────────────────────────

function PositionDetail({
  position,
  onUpdated,
  onEdit,
}: {
  position: SerializedInvestmentPosition;
  onUpdated: (updated: SerializedInvestmentPosition) => void;
  onEdit: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [entryModal, setEntryModal] = useState(false);
  const [form, setForm] = useState<EntryForm>(emptyEntryForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const entryKindOptions = useMemo(
    () =>
      ENTRY_KIND_VALUES.map((value) => ({
        value,
        label: translateInvestmentEntryKind(value, t),
      })),
    [t],
  );

  const currency = position.currencyCode;

  // Build line chart data from entries + current balance
  const chartData = useMemo(() => {
    const points: { label: string; value: number }[] = [];

    // Add each entry that has a balance snapshot
    const entriesWithBalance = position.entries.filter((e) => e.balance !== null);

    if (entriesWithBalance.length === 0 && position.entries.length > 0) {
      // Build balance trajectory from deposits/withdrawals
      let running = 0;
      for (const entry of position.entries) {
        if (entry.kind === "DEPOSIT") running += entry.amount;
        else if (entry.kind === "WITHDRAWAL") running -= entry.amount;
        points.push({ label: formatDateShort(entry.date, locale), value: Math.max(0, running) });
      }
      // Add current balance as last point if different from calculated
      if (points.length > 0) {
        points.push({
          label: t("investments.pages.positions.chartToday"),
          value: position.currentBalance,
        });
      }
    } else {
      for (const entry of entriesWithBalance) {
        points.push({
          label: formatDateShort(entry.date, locale),
          value: entry.balance!,
        });
      }
      // Always end with current balance
      const lastEntry = entriesWithBalance.at(-1);
      if (!lastEntry || lastEntry.balance !== position.currentBalance) {
        points.push({ label: t("investments.pages.positions.chartToday"), value: position.currentBalance });
      }
    }

    // If only 1 point, duplicate it so the chart renders
    if (points.length === 1) {
      points.unshift({ label: t("investments.pages.positions.chartStart"), value: points[0]!.value });
    }

    return points;
  }, [position, locale, t]);

  async function submitEntry() {
    setSaving(true);
    setError(null);
    try {
      const isBalanceUpdate = form.kind === "BALANCE_UPDATE";
      const amount = isBalanceUpdate
        ? Number(form.balance) || 0
        : Number(form.amount) || 0;
      const balance = form.balance ? Number(form.balance) : null;

      const { response, data } = await fetchJson<{
        position?: SerializedInvestmentPosition;
        error?: string;
      }>(`/api/positions/${position.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          amount,
          balance,
          date: form.date,
          notes: form.notes || null,
          // Qualquer lançamento com saldo informado atualiza o saldo exibido
          updateCurrentBalance: balance !== null,
        }),
      });
      if (!response.ok) throw new Error(data?.error ?? t("investments.pages.positions.entrySaveError"));
      if (data?.position) onUpdated(data.position);
      setEntryModal(false);
      setForm(emptyEntryForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("investments.pages.positions.genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: SerializedInvestmentEntry) {
    const ok = await confirm({
      title: t("investments.pages.positions.entryDeleteTitle"),
      message: t("investments.pages.positions.entryDeleteMessage"),
      confirmLabel: t("common.remove"),
      tone: "error",
    });
    if (!ok) return;
    const { response, data } = await fetchJson<{
      position?: SerializedInvestmentPosition;
      error?: string;
    }>(`/api/positions/${position.id}/entries/${entry.id}`, { method: "DELETE" });
    if (response.ok && data?.position) onUpdated(data.position);
  }

  const profitPositive = (position.profit ?? 0) >= 0;
  const hasProfit = position.profit !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {translateInvestmentCategory(position.category, t)}
            </Badge>
            {position.institution ? (
              <span className="text-xs text-zinc-500">{position.institution}</span>
            ) : null}
            {position.assetSymbol ? (
              <span className="text-xs font-mono text-zinc-500">{position.assetSymbol}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
            <IconPencil size="sm" /> {t("investments.pages.positions.edit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setForm({ ...emptyEntryForm(), kind: "BALANCE_UPDATE", balance: String(position.currentBalance) });
              setError(null);
              setEntryModal(true);
            }}
          >
            <IconRepeat size="sm" /> {t("investments.pages.positions.updateBalance")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setForm(emptyEntryForm());
              setError(null);
              setEntryModal(true);
            }}
          >
            <IconPlus size="sm" /> {t("investments.pages.positions.depositButton")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">{t("investments.pages.positions.balanceLabel")}</p>
            <Money value={position.currentBalance} currency={currency} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">{t("investments.pages.positions.totalInvested")}</p>
            <Money value={position.totalDeposited} currency={currency} size="lg" />
            {position.totalWithdrawn > 0 ? (
              <p className="text-xs text-zinc-400">
                −{" "}
                {formatMoney(position.totalWithdrawn, { currency })}{" "}
                {t("investments.pages.positions.withdrawnSuffix")}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">{t("investments.pages.positions.profit")}</p>
            {hasProfit ? (
              <p
                className={`text-xl font-bold ${profitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {profitPositive ? "+" : ""}
                {formatMoney(position.profit!, { currency })}
              </p>
            ) : (
              <>
                <p className="text-xl font-bold text-zinc-400">—</p>
                <p className="text-[10px] text-zinc-400">{t("investments.pages.positions.profitCalcHint")}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">{t("investments.pages.positions.profitPercentLabel")}</p>
            {position.profitPercent !== null ? (
              <p
                className={`text-xl font-bold ${profitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {profitPositive ? "+" : ""}
                {position.profitPercent.toFixed(2)}%
              </p>
            ) : (
              <p className="text-xl font-bold text-zinc-400">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line chart */}
      {chartData.length >= 2 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("investments.pages.positions.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={chartData}
              formatValue={(v) => formatMoney(v, { currency })}
              showArea
              fullWidth
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Entry history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("investments.pages.positions.entriesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {position.entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              {t("investments.pages.positions.entriesEmptyHint")}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...position.entries]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        entry.kind === "DEPOSIT"
                          ? "bg-emerald-500"
                          : entry.kind === "WITHDRAWAL"
                            ? "bg-red-500"
                            : "bg-sky-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {translateInvestmentEntryKind(entry.kind, t)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {formatDateShort(entry.date, locale)}
                        </span>
                      </div>
                      {entry.notes ? (
                        <p className="truncate text-[11px] text-zinc-400">{entry.notes}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      {entry.kind !== "BALANCE_UPDATE" ? (
                        <p
                          className={`text-sm font-medium ${entry.kind === "DEPOSIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {entry.kind === "DEPOSIT" ? "+" : "−"}
                          {formatMoney(entry.amount, { currency })}
                        </p>
                      ) : null}
                      {entry.balance !== null ? (
                        <p className="text-xs text-zinc-500">
                          saldo: {formatMoney(entry.balance, { currency })}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void deleteEntry(entry)}
                    >
                      <IconTrash size="xs" />
                      {t("investments.pages.positions.delete")}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry modal */}
      <Modal
        open={entryModal}
        onClose={() => setEntryModal(false)}
        title={t("investments.pages.positions.newEntryTitle")}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEntryModal(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void submitEntry()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
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
            <Label>{t("investments.pages.positions.entryKindLabel")}</Label>
            <Select
              options={entryKindOptions}
              value={form.kind}
              onChange={(v) => setForm((prev) => ({ ...prev, kind: v as InvestmentEntryKind }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.kind !== "BALANCE_UPDATE" ? (
              <div className="space-y-1">
                <Label>
                  {form.kind === "DEPOSIT"
                    ? t("investments.pages.positions.depositAmountLabel")
                    : t("investments.pages.positions.withdrawalAmountLabel")}
                </Label>
                <NumberInput
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>
                {form.kind === "BALANCE_UPDATE"
                  ? t("investments.pages.positions.balanceLabel")
                  : t("investments.pages.positions.balanceAfterOptional")}
              </Label>
              <NumberInput
                value={form.balance}
                onChange={(e) => setForm((prev) => ({ ...prev, balance: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("investments.pages.positions.entryDateLabel")}</Label>
            <DatePicker
              value={form.date}
              onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
              clearable={false}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("investments.pages.positions.entryNotesLabel")}</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t("investments.pages.positions.entryNotesPlaceholder")}
            />
          </div>
          {form.kind === "BALANCE_UPDATE" ? (
            <p className="text-xs text-zinc-500">
              {t("investments.pages.positions.balanceUpdateHint")}
            </p>
          ) : null}
        </div>
      </Modal>

      {dialog}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function PositionsPanel({
  positionId,
  onDetailPositionChange,
}: {
  positionId?: string | null;
  onDetailPositionChange?: (position: SerializedInvestmentPosition | null) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [positions, setPositions] = useState<SerializedInvestmentPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPosition, setDetailPosition] = useState<SerializedInvestmentPosition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [positionModal, setPositionModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PositionForm>(emptyPositionForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const categoryOptions = useMemo(() => investmentCategoryOptions(t), [t]);
  const currencyOptions = useMemo(
    () => [
      { value: "BRL", label: t("investments.pages.positions.currencyBrl") },
      { value: "USD", label: t("investments.pages.positions.currencyUsd") },
      { value: "EUR", label: t("investments.pages.positions.currencyEur") },
    ],
    [t],
  );

  const selected = useMemo(() => {
    if (!positionId) return null;
    return positions.find((p) => p.id === positionId) ?? detailPosition;
  }, [positionId, positions, detailPosition]);

  useEffect(() => {
    onDetailPositionChange?.(positionId ? selected : null);
  }, [onDetailPositionChange, positionId, selected]);

  useEffect(() => {
    if (!positionId) {
      setDetailPosition(null);
      return;
    }

    const cached = positions.find((p) => p.id === positionId);
    if (cached) {
      setDetailPosition(cached);
      return;
    }

    setDetailLoading(true);
    void fetchJson<{ position?: SerializedInvestmentPosition; error?: string }>(
      `/api/positions/${positionId}`,
    ).then(({ response, data }) => {
      if (response.ok && data?.position) {
        setDetailPosition(data.position);
      } else {
        router.replace("/investments");
      }
      setDetailLoading(false);
    });
  }, [positionId, positions, router]);

  async function load() {
    setLoading(true);
    const { response, data } = await fetchJson<{
      positions?: SerializedInvestmentPosition[];
    }>("/api/positions");
    setLoading(false);
    if (response.ok) {
      const list = data?.positions ?? [];
      setPositions(list);
      if (positionId) {
        const fresh = list.find((p) => p.id === positionId);
        if (fresh) setDetailPosition(fresh);
      }
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyPositionForm());
    setError(null);
    setPositionModal(true);
  }

  function startEdit(position: SerializedInvestmentPosition) {
    setEditingId(position.id);
    setForm({
      name: position.name,
      assetSymbol: position.assetSymbol ?? "",
      category: position.category,
      currencyCode: position.currencyCode,
      institution: position.institution ?? "",
      currentBalance: String(position.currentBalance),
      initialDeposit: "",
      initialDepositDate: todayIso(),
    });
    setError(null);
    setPositionModal(true);
  }

  async function savePosition() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        assetSymbol: form.assetSymbol || null,
        category: form.category,
        currencyCode: form.currencyCode,
        institution: form.institution || null,
        currentBalance: Number(form.currentBalance) || 0,
      };
      if (!editingId && form.initialDeposit) {
        payload.initialDeposit = Number(form.initialDeposit) || 0;
        payload.initialDepositDate = form.initialDepositDate || null;
      }
      const url = editingId ? `/api/positions/${editingId}` : "/api/positions";
      const method = editingId ? "PATCH" : "POST";
      const { response, data } = await fetchJson<{
        position?: SerializedInvestmentPosition;
        error?: string;
      }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(data?.error ?? t("investments.pages.positions.saveError"));
      setPositionModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("investments.pages.positions.genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition() {
    if (!editingId) return;
    const editingPosition = positions.find((p) => p.id === editingId);
    const ok = await confirm({
      title: t("investments.pages.positions.deleteTitle"),
      message: t("investments.pages.positions.deleteMessage", {
        name: editingPosition?.name ?? "",
      }),
      confirmLabel: t("common.delete"),
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response } = await fetchJson(`/api/positions/${editingId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPositionModal(false);
        if (positionId === editingId) router.push("/investments");
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  // Donut chart data — by category
  const totalBalance = positions.reduce((sum, p) => sum + p.currentBalance, 0);

  const donutSegments = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const pos of positions) {
      byCategory[pos.category] = (byCategory[pos.category] ?? 0) + pos.currentBalance;
    }
    return Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .map(([cat, value]) => ({
        label: translateInvestmentCategory(cat, t),
        value,
        color: INVESTMENT_CATEGORY_COLOR_HEX[cat] ?? "#a1a1aa",
      }));
  }, [positions, t]);

  const totalDeposited = positions.reduce((sum, p) => sum + p.totalDeposited, 0);
  const totalProfit = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const totalProfitPct = totalDeposited > 0 ? (totalProfit / totalDeposited) * 100 : null;

  if (positionId) {
    if (detailLoading && !selected) {
      return <PositionsPanelSkeleton />;
    }
    if (!selected) return null;

    return (
      <>
        <PositionDetail
          position={selected}
          onUpdated={(updated) => {
            setDetailPosition(updated);
            setPositions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
          onEdit={() => startEdit(selected)}
        />
        {renderPositionModal()}
        {dialog}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {positions.length === 1
            ? t("investments.pages.positions.positionCountOne", { count: positions.length })
            : t("investments.pages.positions.positionCountMany", { count: positions.length })}
        </p>
        <Button type="button" size="sm" onClick={startCreate}>
          <IconPlus size="sm" /> {t("investments.pages.positions.addPosition")}
        </Button>
      </div>

      {loading ? (
        <PositionsPanelSkeleton />
      ) : positions.length === 0 ? (
        <EmptyState
          icon={<IconCoins className="h-6 w-6" />}
          title={t("investments.pages.positions.emptyTitle")}
          description={t("investments.pages.positions.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> {t("investments.pages.positions.addPosition")}
            </Button>
          }
        />
      ) : (
        <>
          {/* Portfolio overview */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Donut chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("investments.pages.positions.allocation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  segments={donutSegments}
                  size={140}
                  formatValue={(v) => formatMoney(v, { currency: "BRL" })}
                  animateKey={positions.length}
                />
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-zinc-500">{t("investments.pages.positions.totalWealth")}</p>
                  <Money value={totalBalance} currency="BRL" size="lg" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-zinc-500">{t("investments.pages.positions.totalInvested")}</p>
                  <Money value={totalDeposited} currency="BRL" size="lg" />
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  <p className="text-xs text-zinc-500">{t("investments.pages.positions.totalResult")}</p>
                  <div className="flex items-end gap-3">
                    <p
                      className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {totalProfit >= 0 ? "+" : ""}
                      {formatMoney(totalProfit, { currency: "BRL" })}
                    </p>
                    {totalProfitPct !== null ? (
                      <p
                        className={`mb-0.5 text-sm font-medium ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        ({totalProfit >= 0 ? "+" : ""}
                        {totalProfitPct.toFixed(1)}%)
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Position cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {t("investments.pages.positions.positionsSectionTitle", { count: positions.length })}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {positions.map((pos) => {
                const pct =
                  totalBalance > 0 ? (pos.currentBalance / totalBalance) * 100 : 0;
                const profitPos = (pos.profit ?? 0) >= 0;
                return (
                  <Card key={pos.id} className="overflow-hidden">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                INVESTMENT_CATEGORY_COLOR_HEX[pos.category] ?? "#a1a1aa",
                            }}
                          />
                            <CardTitle className="truncate text-sm">{pos.name}</CardTitle>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 pl-4">
                            <span className="text-[10px] text-zinc-400">
                              {translateInvestmentCategory(pos.category, t)}
                            </span>
                            {pos.institution ? (
                              <span className="text-[10px] text-zinc-400">· {pos.institution}</span>
                            ) : null}
                          </div>
                        </div>
                        <p className="shrink-0 text-[10px] text-zinc-400">{pct.toFixed(0)}%</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 px-3 pb-2 pt-0">
                      <div>
                        <p className="text-xs text-zinc-500">{t("investments.pages.positions.balanceLabel")}</p>
                        <Money value={pos.currentBalance} currency={pos.currencyCode} size="md" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500">{t("investments.pages.positions.depositedLabel")}</p>
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {formatMoney(pos.totalDeposited, { currency: pos.currencyCode })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500">{t("investments.pages.positions.resultLabel")}</p>
                          {pos.profit !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              <p
                                className={`text-sm font-semibold ${profitPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {profitPos ? "+" : ""}
                                {formatMoney(pos.profit, { currency: pos.currencyCode })}
                              </p>
                              <ProfitBadge value={pos.profit} percent={pos.profitPercent} />
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-zinc-400">—</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {pos.entries.length > 0
                          ? pos.entries.length === 1
                            ? t("investments.pages.positions.entryCountOne", {
                                count: pos.entries.length,
                              })
                            : t("investments.pages.positions.entryCountMany", {
                                count: pos.entries.length,
                              })
                          : t("investments.pages.positions.noEntriesShort")}
                      </p>
                    </CardContent>
                    <div className="flex gap-1.5 border-t border-zinc-100 p-2 dark:border-zinc-800">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(investmentPositionPath(pos.id))}
                      >
                        <IconChevronRight size="xs" />
                        {t("investments.pages.positions.viewDetails")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => startEdit(pos)}
                      >
                        <IconPencil size="xs" />
                        {t("investments.pages.positions.edit")}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {renderPositionModal()}

      {dialog}
    </div>
  );

  function renderPositionModal() {
    return (
      <Modal
        open={positionModal}
        onClose={() => setPositionModal(false)}
        title={editingId ? t("investments.pages.positions.editTitle") : t("investments.pages.positions.createTitle")}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPositionModal(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void deletePosition()}
                disabled={saving}
              >
                <IconTrash size="sm" />
                {t("investments.pages.positions.delete")}
              </Button>
            ) : null}
            <Button type="button" onClick={() => void savePosition()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
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
            <Label>{t("investments.pages.positions.nameLabel")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("investments.pages.positions.namePlaceholder")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("investments.pages.positions.categoryLabel")}</Label>
              <Select
                options={categoryOptions}
                value={form.category}
                onChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("investments.pages.positions.currencyLabel")}</Label>
              <Select
                options={currencyOptions}
                value={form.currencyCode}
                onChange={(v) => setForm((prev) => ({ ...prev, currencyCode: v }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("investments.pages.positions.symbolLabel")}</Label>
              <Input
                value={form.assetSymbol}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, assetSymbol: e.target.value.toUpperCase() }))
                }
                placeholder={t("investments.pages.positions.symbolPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("investments.pages.positions.institutionLabel")}</Label>
              <Input
                value={form.institution}
                onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
                placeholder={t("investments.pages.positions.institutionPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("investments.pages.positions.balanceLabel")}</Label>
            <NumberInput
              value={form.currentBalance}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, currentBalance: e.target.value }))
              }
              placeholder="0,00"
            />
            <p className="text-[11px] text-zinc-400">
              {t("investments.pages.positions.balanceHint")}
            </p>
          </div>
          {!editingId ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("investments.pages.positions.initialDepositLabel")}</Label>
                <NumberInput
                  value={form.initialDeposit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, initialDeposit: e.target.value }))
                  }
                  placeholder="0,00"
                />
                <p className="text-[11px] text-zinc-400">
                  {t("investments.pages.positions.initialDepositHint")}
                </p>
              </div>
              <div className="space-y-1">
                <Label>{t("investments.pages.positions.initialDateLabel")}</Label>
                <DatePicker
                  value={form.initialDepositDate}
                  onChange={(v) => setForm((prev) => ({ ...prev, initialDepositDate: v }))}
                  clearable
                />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }
}
