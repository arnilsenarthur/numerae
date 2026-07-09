"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { cardClickable } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/chart";
import { IconChevronDown } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import { RISK_PROFILES, riskProfileMeta, type SerializedMarketAsset } from "@/types/market";

const STORAGE_KEY = "numerae:portfolio-profile";

function loadProfile(): { monthlyBudget: string; profile: string; currency: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { monthlyBudget: string; profile: string; currency: string }) : null;
  } catch {
    return null;
  }
}

function saveProfile(monthlyBudget: string, profile: string, currency: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ monthlyBudget, profile, currency }));
  } catch {
    // ignore
  }
}

/** Current approximate Brazilian market reference rates (educational) */
const MARKET_INDICES = [
  { label: "Selic", value: "10,75% a.a.", description: "Taxa básica de juros (Banco Central)" },
  { label: "CDI", value: "~10,65% a.a.", description: "Referência renda fixa" },
  { label: "IPCA", value: "~5,5% a.a.", description: "Inflação oficial (acum. 12m)" },
  { label: "IBOV (5a)", value: "~12% a.a.", description: "Ibovespa — retorno histórico 5 anos" },
  { label: "S&P 500 (USD)", value: "~10% a.a.", description: "Retorno histórico real de longo prazo" },
];

/** Alocação alvo por classe de ativo e perfil de risco (% do portfólio). */
const ALLOCATION_TEMPLATES: Record<
  string,
  { label: string; pct: number; classes: string[]; color?: string }[]
> = {
  conservative: [
    { label: "Renda fixa (CDI/Tesouro)", pct: 55, classes: ["BOND", "FIXED"], color: "#10b981" },
    { label: "Ações brasileiras (B3)", pct: 15, classes: ["STOCK_BR"], color: "#0ea5e9" },
    { label: "ETFs globais", pct: 15, classes: ["ETF"], color: "#8b5cf6" },
    { label: "FIIs", pct: 10, classes: ["FII"], color: "#f59e0b" },
    { label: "Cripto", pct: 5, classes: ["CRYPTO"], color: "#f43f5e" },
  ],
  moderate: [
    { label: "Renda fixa (CDI/Tesouro)", pct: 30, classes: ["BOND", "FIXED"], color: "#10b981" },
    { label: "Ações brasileiras (B3)", pct: 25, classes: ["STOCK_BR"], color: "#0ea5e9" },
    { label: "Ações globais (EUA)", pct: 20, classes: ["STOCK_US"], color: "#3b82f6" },
    { label: "ETFs globais", pct: 15, classes: ["ETF"], color: "#8b5cf6" },
    { label: "FIIs", pct: 5, classes: ["FII"], color: "#f59e0b" },
    { label: "Cripto", pct: 5, classes: ["CRYPTO"], color: "#f43f5e" },
  ],
  aggressive: [
    { label: "Renda fixa (reserva)", pct: 10, classes: ["BOND", "FIXED"], color: "#10b981" },
    { label: "Ações brasileiras (B3)", pct: 25, classes: ["STOCK_BR"], color: "#0ea5e9" },
    { label: "Ações globais (EUA)", pct: 30, classes: ["STOCK_US"], color: "#3b82f6" },
    { label: "ETFs globais", pct: 15, classes: ["ETF"], color: "#8b5cf6" },
    { label: "FIIs", pct: 5, classes: ["FII"], color: "#f59e0b" },
    { label: "Cripto", pct: 15, classes: ["CRYPTO"], color: "#f43f5e" },
  ],
};

/** Mapa de sugestões de ativos por categoria. */
const CATEGORY_ASSET_HINTS: Record<
  string,
  { items: string[]; benchmark: string; institutions?: string[] }
> = {
  "Renda fixa (CDI/Tesouro)": {
    benchmark: "CDI (~10,65% a.a.) / IPCA+6%",
    items: [
      "Tesouro Selic — liquidez diária, risco zero",
      "Tesouro IPCA+ 2035 — proteção real de longo prazo",
      "CDB 100-115% CDI (Nubank, Inter, C6)",
      "LCI/LCA — isenção IR pessoa física",
      "CRA/CRI — isenção IR, risco crédito privado",
    ],
    institutions: ["BTG Pactual (renda fixa privada)", "XP (Tesouro Direto)", "Nubank (CDB automático)"],
  },
  "Ações brasileiras (B3)": {
    benchmark: "IBOV (~12% a.a. histórico 5a)",
    items: [
      "VALE3, PETR4 — commodities, dividendos",
      "ITUB4, BBDC4, BBAS3 — bancos, dividendos",
      "WEGE3, RENT3, RADL3 — crescimento",
      "BPAC11 — BTG, gestão de ativos",
      "PRIO3, CSAN3 — energia e combustíveis",
    ],
    institutions: ["BTG (análise)", "XP (carteira recomendada)", "Clear (B3 direto)"],
  },
  "Ações globais (EUA)": {
    benchmark: "S&P 500 (~10% a.a. USD histórico)",
    items: [
      "AAPL, MSFT, GOOGL, NVDA — Big Tech",
      "BRK-B, JNJ, PG — defensivos/dividendos",
      "AMZN, META — crescimento",
      "BDRs via B3: AAPL34, AMZO34, MSFT34",
    ],
    institutions: ["Avenue (conta USD)", "Nomad (conta USD)", "BTG Global (via B3/BDR)"],
  },
  "ETFs globais": {
    benchmark: "Blended (IBOV + S&P + DM)",
    items: [
      "IVVB11 — S&P 500 em BRL (B3)",
      "BOVA11 — Ibovespa index fund",
      "HASH11 — cripto diversificado",
      "VT / VTI — mercado global/EUA total (USD)",
      "QQQ — Nasdaq 100 (USD)",
    ],
    institutions: ["XP (maior variedade ETFs)", "BTG", "Avenue (ETFs USD)"],
  },
  "Renda fixa (reserva)": {
    benchmark: "CDI (~10,65% a.a.)",
    items: [
      "Tesouro Selic — liquidez imediata",
      "CDB liquidez diária 100%+ CDI",
      "Fundo DI taxa zero (grandes bancos digitais)",
    ],
    institutions: ["Nubank (rendimento automático)", "Inter", "C6 Bank"],
  },
  "FIIs": {
    benchmark: "IFIX (~8-10% a.a. + DY ~8%)",
    items: [
      "MXRF11 — papel, alta distribuição",
      "HGLG11 — logística, boa gestão",
      "XPML11 — shoppings",
      "KNRI11 — diversificado",
      "KNCR11 — papel pós-fixado (CDI+)",
    ],
    institutions: ["XP (maior cobertura FII)", "BTG (FIIs próprios)"],
  },
  "Cripto": {
    benchmark: "BTC (referência do setor)",
    items: [
      "BTC — reserva de valor, 50-60% da posição",
      "ETH — smart contracts, 20-25%",
      "SOL, BNB — ecossistemas tier-2",
      "Stablecoins (USDC/USDT) — liquidez cripto",
    ],
    institutions: ["Binance (maior liquidez)", "Mercado Bitcoin (regulado BR)", "Coinbase (USD)"],
  },
};

function splitDetail(text: string) {
  const dash = text.indexOf(" — ");
  if (dash !== -1) {
    return { primary: text.slice(0, dash), secondary: text.slice(dash + 3) };
  }
  const match = text.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return { primary: match[1]!, secondary: match[2]! };
  }
  return { primary: text, secondary: null as string | null };
}

function CategorySuggestionCard({
  label,
  pct,
  color,
  monthlyValue,
  currency,
  hints,
  categoryAssets,
  expanded,
  onToggle,
}: {
  label: string;
  pct: number;
  color?: string;
  monthlyValue: number;
  currency: string;
  hints: (typeof CATEGORY_ASSET_HINTS)[string] | null;
  categoryAssets: SerializedMarketAsset[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={`${cardClickable} ${expanded ? "border-emerald-500/40 ring-1 ring-emerald-400/20" : ""}`}
      onClick={onToggle}
    >
      <CardHeader className="space-y-1.5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color ?? "#a1a1aa" }}
            />
            <span className="truncate text-sm font-medium">{label}</span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
        {monthlyValue > 0 ? (
          <p className="text-sm text-zinc-500">
            <Money value={monthlyValue} currency={currency} />
            <span className="text-zinc-400"> / mês</span>
          </p>
        ) : null}
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {hints?.benchmark ? (
            <p className="text-sm text-zinc-500">{hints.benchmark}</p>
          ) : null}

          {categoryAssets.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Cotações</p>
              <ul className="space-y-2">
                {categoryAssets.slice(0, 5).map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{asset.symbol}</span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      {asset.price !== null ? (
                        <Money value={asset.price} currency={asset.currencyCode} size="sm" />
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                      {asset.changePercent !== null ? (
                        <span
                          className={
                            asset.changePercent >= 0 ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {asset.changePercent >= 0 ? "+" : ""}
                          {asset.changePercent.toFixed(1)}%
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hints?.items.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sugestões</p>
              <ul className="space-y-2">
                {hints.items.map((hint) => {
                  const { primary, secondary } = splitDetail(hint);
                  return (
                    <li key={hint} className="text-sm leading-snug">
                      <span className="font-medium">{primary}</span>
                      {secondary ? (
                        <span className="text-zinc-500"> · {secondary}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {hints?.institutions?.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Corretoras</p>
              <div className="flex flex-wrap gap-1.5">
                {hints.institutions.map((inst) => {
                  const { primary } = splitDetail(inst);
                  return (
                    <Badge key={inst} variant="outline" className="font-normal">
                      {primary}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : (
        <CardContent className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
            Ver sugestões
            <IconChevronDown size="xs" className="opacity-60" />
          </span>
        </CardContent>
      )}
    </Card>
  );
}

const PROFILE_OPTIONS = RISK_PROFILES.map((p) => ({
  value: p.value,
  label: `${p.label} (~${p.annualRatePercent}% a.a.)`,
}));

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
];

export function PortfolioPanel() {
  const saved = typeof window !== "undefined" ? loadProfile() : null;
  const [monthlyBudget, setMonthlyBudget] = useState(saved?.monthlyBudget ?? "1000");
  const [profile, setProfile] = useState(saved?.profile ?? "moderate");
  const [currency, setCurrency] = useState(saved?.currency ?? "BRL");
  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    fetchJson<{ assets?: SerializedMarketAsset[] }>("/api/market")
      .then(({ response, data }) => {
        if (response.ok) setAssets(data?.assets ?? []);
      })
      .catch(() => {});
  }, []);

  function handleSaveProfile() {
    saveProfile(monthlyBudget, profile, currency);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  const allocation = ALLOCATION_TEMPLATES[profile] ?? ALLOCATION_TEMPLATES.moderate!;
  const budget = Math.max(0, Number(monthlyBudget) || 0);
  const profileMeta = riskProfileMeta(profile);

  const donutData = useMemo(
    () =>
      allocation.map((item) => ({
        label: item.label,
        value: (budget * item.pct) / 100,
        color: item.color,
      })),
    [allocation, budget],
  );

  function assetsForCategory(classes: string[]): SerializedMarketAsset[] {
    const kindMap: Record<string, string> = {
      STOCK_BR: "STOCK",
      STOCK_US: "STOCK",
      ETF: "ETF",
      FII: "FII",
      CRYPTO: "CRYPTO",
    };
    const targetKinds = new Set(classes.map((c) => kindMap[c] ?? c));
    const isBR = classes.includes("STOCK_BR");
    const isUS = classes.includes("STOCK_US");

    return assets.filter((a) => {
      if (!targetKinds.has(a.kind)) return false;
      if (a.kind === "STOCK") {
        if (isBR && !isUS) return a.countryCode === "BR";
        if (isUS && !isBR) return a.countryCode !== "BR";
      }
      return true;
    });
  }

  return (
    <div className="space-y-4">
      {/* Config row */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Aporte mensal</Label>
              <div className="flex items-center gap-2">
                <div className="w-24">
                  <Select options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} size="sm" />
                </div>
                <div className="w-36">
                  <NumberInput
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="1.000"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Perfil de risco</Label>
              <div className="w-56">
                <Select options={PROFILE_OPTIONS} value={profile} onChange={setProfile} />
              </div>
            </div>
            <div className="pb-1">
              <Badge variant="success">{profileMeta.label}</Badge>
              <p className="mt-0.5 text-xs text-zinc-500">{profileMeta.description}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveProfile}
              className="mb-0.5"
            >
              {savedFeedback ? "Salvo ✓" : "Salvar perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market reference indices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Índices de referência (Brasil · estimativas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {MARKET_INDICES.map((idx) => (
              <div key={idx.label} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{idx.label}</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{idx.value}</p>
                <p className="text-[10px] text-zinc-500">{idx.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-zinc-400">Valores aproximados para referência. Atualize-os ao planejar.</p>
        </CardContent>
      </Card>

      {/* Allocation donut */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Distribuição sugerida — {formatMoney(budget, { currency })}/mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart
            segments={donutData}
            size={150}
            formatValue={(v) => formatMoney(v, { currency })}
            animateKey={`${profile}-${budget}`}
          />
        </CardContent>
      </Card>

      {/* Per-category deep dive */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Onde investir em cada categoria
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allocation.map((item) => (
            <CategorySuggestionCard
              key={item.label}
              label={item.label}
              pct={item.pct}
              color={item.color}
              monthlyValue={(budget * item.pct) / 100}
              currency={currency}
              hints={CATEGORY_ASSET_HINTS[item.label] ?? null}
              categoryAssets={assetsForCategory(item.classes)}
              expanded={expanded === item.label}
              onToggle={() => setExpanded(expanded === item.label ? null : item.label)}
            />
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-zinc-400">
        * Sugestões baseadas em alocações típicas por perfil. Não constituem recomendação de
        investimento. Consulte um assessor financeiro antes de investir.
      </p>
    </div>
  );
}
