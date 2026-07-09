"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { IconInfo } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryPatch } from "@/hooks/use-url-query-state";
import { useLocale, useT } from "@/i18n/locale-provider";
import { TipListCard } from "@/modules/tips/components/tip-list-card";
import { tipCategoryOptions, type SerializedTip, type TipCategory } from "@/types/tips";

export function TipsApp() {
  const t = useT();
  const { locale: appLocale } = useLocale();
  const [tips, setTips] = useState<SerializedTip[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const categoryFilter = useMemo((): TipCategory | "all" => {
    const raw = searchParams.get("category");
    if (!raw || raw === "all") return "all";
    if (tips.some((tip) => tip.category === raw)) return raw as TipCategory;
    return "all";
  }, [searchParams, tips]);

  function setCategoryFilter(next: TipCategory | "all") {
    patchQuery({ category: next === "all" ? null : next, page: null });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { response, data } = await fetchJson<{ tips?: SerializedTip[] }>("/api/tips");
      if (cancelled) return;
      setLoading(false);
      if (response.ok) setTips(data?.tips ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [appLocale]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return tips;
    return tips.filter((tip) => tip.category === categoryFilter);
  }, [tips, categoryFilter]);

  const categoryOptions = useMemo(() => tipCategoryOptions(t), [t]);

  const filterOptions = useMemo(() => {
    const used = new Set(tips.map((tip) => tip.category));
    return categoryOptions.filter((option) => used.has(option.value as TipCategory));
  }, [tips, categoryOptions]);

  const columns = useMemo<DataTableColumn<SerializedTip>[]>(
    () => [
      {
        id: "tip",
        header: t("tips.page.title"),
        sortValue: (row) => `${row.author} ${row.quote}`,
        cell: (row) => <TipListCard tip={row} />,
      },
    ],
    [t],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4">
      <PageHeader
        meta={{
          kicker: t("tips.page.kicker"),
          title: t("tips.page.title"),
          subtitle: t("tips.page.subtitle"),
        }}
      />

      {filterOptions.length > 0 ? (
        <ButtonGroup className="w-full sm:w-auto">
          <ButtonGroupItem
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          >
            {t("tips.filterAll")}
          </ButtonGroupItem>
          {filterOptions.map((option) => (
            <ButtonGroupItem
              key={option.value}
              active={categoryFilter === option.value}
              onClick={() => setCategoryFilter(option.value as TipCategory)}
            >
              {option.label}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">{t("tips.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-zinc-500">
            <IconInfo size="md" className="shrink-0 opacity-60" />
            {t("tips.empty")}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowKey={(row) => row.id}
          layout="stack"
          pageSize={10}
          searchable={false}
          emptyMessage={t("tips.empty")}
        />
      )}

      <p className="text-xs text-zinc-400">
        {t("tips.disclaimer")}{" "}
        <Link href="/dashboard" className="text-emerald-600 hover:underline dark:text-emerald-400">
          {t("tips.backToDashboard")}
        </Link>
      </p>
    </div>
  );
}
