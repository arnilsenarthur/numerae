"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { IconInfo } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { TIP_DISCLAIMER } from "@/lib/tip-of-day";
import { TipListCard } from "@/modules/tips/components/tip-list-card";
import { TIP_CATEGORY_OPTIONS, type SerializedTip, type TipCategory } from "@/types/tips";

export function TipsApp() {
  const [tips, setTips] = useState<SerializedTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<TipCategory | "all">("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { response, data } = await fetchJson<{ tips?: SerializedTip[] }>("/api/tips");
      if (cancelled) return;
      setLoading(false);
      if (response.ok) setTips(data?.tips ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return tips;
    return tips.filter((tip) => tip.category === categoryFilter);
  }, [tips, categoryFilter]);

  const filterOptions = useMemo(() => {
    const used = new Set(tips.map((tip) => tip.category));
    return TIP_CATEGORY_OPTIONS.filter((option) => used.has(option.value as TipCategory));
  }, [tips]);

  const columns = useMemo<DataTableColumn<SerializedTip>[]>(
    () => [
      {
        id: "tip",
        header: "Dica",
        sortValue: (row) => `${row.author} ${row.quote}`,
        cell: (row) => <TipListCard tip={row} />,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4">
      <PageHeader
        meta={{
          kicker: "Conteúdo",
          title: "Dicas",
          subtitle: "Toque em uma dica para abrir a fonte original (artigo, vídeo ou página oficial).",
        }}
      />

      {filterOptions.length > 0 ? (
        <ButtonGroup className="w-full sm:w-auto">
          <ButtonGroupItem
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          >
            Todas
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
        <p className="text-sm text-zinc-500">Carregando dicas…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-zinc-500">
            <IconInfo size="md" className="shrink-0 opacity-60" />
            Nenhuma dica disponível no momento.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          key={categoryFilter}
          data={filtered}
          columns={columns}
          getRowKey={(row) => row.id}
          layout="stack"
          pageSize={10}
          searchable={false}
          emptyMessage="Nenhuma dica disponível no momento."
        />
      )}

      <p className="text-xs text-zinc-400">
        {TIP_DISCLAIMER} Alguns textos são trechos ou paráfrases — a fonte é a referência oficial.{" "}
        <Link href="/dashboard" className="text-emerald-600 hover:underline dark:text-emerald-400">
          Voltar à visão geral
        </Link>
      </p>
    </div>
  );
}
