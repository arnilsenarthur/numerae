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
import { useUrlQueryFilter } from "@/hooks/use-url-query-state";
import { useT } from "@/i18n/locale-provider";
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  localeSelectOptions,
  resolveAppLocale,
} from "@/i18n/locales";
import {
  tipCategoryLabel,
  tipCategoryOptions,
  type SerializedTip,
  type TipCategory,
} from "@/types/tips";

type TipForm = {
  quote: string;
  author: string;
  category: TipCategory;
  locale: string;
  sourceUrl: string;
  sourceLabel: string;
  active: boolean;
};

const emptyForm = (): TipForm => ({
  quote: "",
  author: "",
  category: "general",
  locale: DEFAULT_LOCALE,
  sourceUrl: "",
  sourceLabel: "",
  active: true,
});

export function TipsAdmin() {
  const t = useT();
  const categoryOptions = useMemo(() => tipCategoryOptions(t), [t]);
  const localeFilterOptions = useMemo(
    () => localeSelectOptions(t("admin.common.allLocales")),
    [t],
  );
  const formLocaleOptions = useMemo(() => localeSelectOptions(), []);
  const [localeFilter, setLocaleFilter] = useUrlQueryFilter({ key: "locale", defaultValue: "" });
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
      const query = localeFilter
        ? `?locale=${encodeURIComponent(resolveAppLocale(localeFilter))}`
        : "";
      const { response, data } = await fetchJson<{ tips: SerializedTip[]; error?: string }>(
        `/api/admin/tips${query}`,
      );
      if (!response.ok || !data?.tips) {
        throw new Error(data?.error ?? t("admin.tips.errorLoad"));
      }
      setTips(data.tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.load"));
    } finally {
      setLoading(false);
    }
  }, [localeFilter, t]);

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
    setForm({
      ...emptyForm(),
      locale: localeFilter ? resolveAppLocale(localeFilter) : DEFAULT_LOCALE,
    });
    setError(null);
  }

  function startEdit(tip: SerializedTip) {
    setIsCreating(false);
    setEditingId(tip.id);
    setForm({
      quote: tip.quote,
      author: tip.author,
      category: tip.category,
      locale: tip.locale,
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
        locale: form.locale,
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
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.save"));
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.save"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: t("admin.tips.confirmDeleteTitle"),
      message: t("admin.tips.confirmDeleteMessage"),
      confirmLabel: t("admin.common.delete"),
      tone: "error",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/tips/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? t("admin.common.error.delete"));
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.common.error.delete"));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<DataTableColumn<SerializedTip>[]>(
    () => [
      {
        id: "quote",
        header: t("admin.tips.quote"),
        sortValue: (row) => row.quote,
        cell: (row) => (
          <span className="line-clamp-2 max-w-md text-sm">{row.quote}</span>
        ),
      },
      {
        id: "author",
        header: t("admin.tips.author"),
        sortValue: (row) => row.author,
        cell: (row) => <span className="text-sm font-medium">{row.author}</span>,
      },
      {
        id: "category",
        header: t("admin.tips.category"),
        sortValue: (row) => tipCategoryLabel(row.category, t),
        cell: (row) => (
          <Badge variant="outline">{tipCategoryLabel(row.category, t)}</Badge>
        ),
      },
      {
        id: "locale",
        header: t("admin.tips.locale"),
        sortValue: (row) => LOCALE_LABELS[resolveAppLocale(row.locale)] ?? row.locale,
        cell: (row) => (
          <Badge variant="outline">
            {LOCALE_LABELS[resolveAppLocale(row.locale)] ?? row.locale}
          </Badge>
        ),
      },
      {
        id: "source",
        header: t("admin.common.columns.source"),
        sortValue: (row) => row.sourceLabel ?? "",
        cell: (row) => (
          <span className="line-clamp-1 max-w-[12rem] text-sm text-zinc-500">
            {row.sourceLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "active",
        header: t("admin.common.columns.status"),
        sortValue: (row) => (row.active ? 1 : 0),
        cell: (row) => (
          <Badge variant={row.active ? "success" : "default"}>
            {row.active ? t("admin.tips.statusActive") : t("admin.tips.statusInactive")}
          </Badge>
        ),
      },
    ],
    [t],
  );

  const modalOpen = isCreating || editingId !== null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {t("admin.common.kicker")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("admin.tips.title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("admin.tips.subtitle")}</p>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">{t("admin.common.registeredFeminine")}</CardTitle>
          <Button type="button" size="sm" onClick={startCreate}>
            <IconPlus size="sm" />
            {t("admin.tips.new")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Label>{t("admin.common.filterByLocale")}</Label>
            <Select
              options={localeFilterOptions}
              value={localeFilter}
              onChange={setLocaleFilter}
              placeholder={t("admin.common.allLocales")}
            />
          </div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.common.loading")}</p>
          ) : (
            <DataTable
              data={tips}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchable
              searchPlaceholder={t("admin.tips.search")}
              searchFilter={(row, query) => {
                const q = query.toLowerCase();
                const localeLabel =
                  LOCALE_LABELS[resolveAppLocale(row.locale)] ?? row.locale;
                return [row.quote, row.author, tipCategoryLabel(row.category, t), localeLabel].some(
                  (field) => field.toLowerCase().includes(q),
                );
              }}
              emptyMessage={t("admin.tips.empty")}
              onRowClick={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isCreating ? t("admin.tips.new") : t("admin.tips.edit")}
        size="lg"
        className="max-w-lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              {t("admin.common.cancel")}
            </Button>
            {!isCreating ? (
              <Button type="button" variant="danger" onClick={() => void remove()} disabled={saving}>
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
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tip-quote">{t("admin.tips.quote")}</Label>
            <textarea
              id="tip-quote"
              value={form.quote}
              onChange={(event) => setForm((prev) => ({ ...prev, quote: event.target.value }))}
              rows={4}
              maxLength={500}
              placeholder={t("admin.tips.placeholders.quote")}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="text-xs text-zinc-400">{form.quote.length}/500</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-author">{t("admin.tips.author")}</Label>
            <Input
              id="tip-author"
              value={form.author}
              onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
              placeholder={t("admin.tips.placeholders.author")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.tips.category")}</Label>
            <Select
              options={categoryOptions}
              value={form.category}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, category: value as TipCategory }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.tips.locale")}</Label>
            <Select
              options={formLocaleOptions}
              value={form.locale}
              onChange={(value) => setForm((prev) => ({ ...prev, locale: value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-source-url">{t("admin.tips.sourceUrl")}</Label>
            <Input
              id="tip-source-url"
              type="url"
              value={form.sourceUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
              placeholder={t("admin.tips.placeholders.sourceUrl")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-source-label">{t("admin.tips.sourceLabel")}</Label>
            <Input
              id="tip-source-label"
              value={form.sourceLabel}
              onChange={(event) => setForm((prev) => ({ ...prev, sourceLabel: event.target.value }))}
              placeholder={t("admin.tips.placeholders.sourceLabel")}
            />
          </div>
          <Switch
            id="tip-active"
            label={t("admin.tips.activeLabel")}
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
