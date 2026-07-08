import { decimalToNumber } from "@/lib/institutions";
import type {
  InvestmentEntryKind,
  MarketAssetKind,
  SerializedInvestmentPlan,
  SerializedInvestmentPosition,
  SerializedMarketAsset,
  SerializedMarketQuote,
} from "@/types/market";

type Decimalish = { toNumber(): number } | null;

type MarketAssetRecord = {
  id: string;
  symbol: string;
  name: string;
  kind: string;
  exchange: string | null;
  currencyCode: string;
  countryCode: string | null;
  logoUrl: string | null;
  active: boolean;
  price: Decimalish;
  priceUpdatedAt: Date | null;
  priceTtlSeconds: number;
  changePercent: Decimalish;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeMarketAsset(record: MarketAssetRecord): SerializedMarketAsset {
  return {
    id: record.id,
    symbol: record.symbol,
    name: record.name,
    kind: record.kind as MarketAssetKind,
    exchange: record.exchange,
    currencyCode: record.currencyCode,
    countryCode: record.countryCode,
    logoUrl: record.logoUrl,
    active: record.active,
    price: decimalToNumber(record.price),
    priceUpdatedAt: record.priceUpdatedAt?.toISOString() ?? null,
    priceTtlSeconds: record.priceTtlSeconds,
    changePercent: decimalToNumber(record.changePercent),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializeMarketQuote(record: {
  id: string;
  assetId: string;
  price: { toNumber(): number };
  quotedAt: Date;
}): SerializedMarketQuote {
  return {
    id: record.id,
    assetId: record.assetId,
    price: record.price.toNumber(),
    quotedAt: record.quotedAt.toISOString(),
  };
}

type InvestmentEntryRecord = {
  id: string;
  positionId: string;
  kind: string;
  amount: { toNumber(): number };
  balance: { toNumber(): number } | null;
  date: Date;
  notes: string | null;
  createdAt: Date;
};

export function serializeInvestmentPosition(
  record: {
    id: string;
    userId: string;
    name: string;
    assetSymbol: string | null;
    category: string;
    currencyCode: string;
    institution: string | null;
    color: string | null;
    currentBalance: { toNumber(): number };
    archived: boolean;
    createdAt: Date;
    updatedAt: Date;
    entries: InvestmentEntryRecord[];
  },
): SerializedInvestmentPosition {
  const entries = record.entries
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => ({
      id: e.id,
      positionId: e.positionId,
      kind: e.kind as InvestmentEntryKind,
      amount: e.amount.toNumber(),
      balance: e.balance ? e.balance.toNumber() : null,
      date: e.date.toISOString(),
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    }));

  const totalDeposited = entries
    .filter((e) => e.kind === "DEPOSIT")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalWithdrawn = entries
    .filter((e) => e.kind === "WITHDRAWAL")
    .reduce((sum, e) => sum + e.amount, 0);
  const currentBalance = record.currentBalance.toNumber();
  // Rendimento = o que você tem agora + o que já tirou − o que colocou.
  // Sem registro de aportes não dá para calcular — retorna null (UI mostra "—").
  const profit =
    totalDeposited > 0 ? currentBalance + totalWithdrawn - totalDeposited : null;
  const profitPercent =
    profit !== null && totalDeposited > 0 ? (profit / totalDeposited) * 100 : null;

  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    assetSymbol: record.assetSymbol,
    category: record.category,
    currencyCode: record.currencyCode,
    institution: record.institution,
    color: record.color,
    currentBalance,
    archived: record.archived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    entries,
    totalDeposited,
    totalWithdrawn,
    profit,
    profitPercent,
  };
}

export function serializeInvestmentPlan(record: {
  id: string;
  name: string;
  currencyCode: string;
  initialAmount: { toNumber(): number };
  monthlyDeposit: { toNumber(): number };
  horizonMonths: number;
  riskProfile: string;
  targetAmount: Decimalish;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SerializedInvestmentPlan {
  return {
    id: record.id,
    name: record.name,
    currencyCode: record.currencyCode,
    initialAmount: record.initialAmount.toNumber(),
    monthlyDeposit: record.monthlyDeposit.toNumber(),
    horizonMonths: record.horizonMonths,
    riskProfile: record.riskProfile,
    targetAmount: decimalToNumber(record.targetAmount),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
