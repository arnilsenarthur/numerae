export const WORKER_IDS = {
  USD_RATE: "usd_rate",
  MARKET_QUOTES: "market_quotes",
  RECURRING_TXN: "recurring_txn",
} as const;

export type WorkerId = (typeof WORKER_IDS)[keyof typeof WORKER_IDS];

export const WORKER_PROVIDERS = {
  frankfurter: {
    id: "frankfurter",
    label: "Frankfurter (ECB)",
    description: "API gratuita baseada no BCE. Sem chave.",
    external: true,
    requiresApiKey: false,
  },
  openexchangerates: {
    id: "openexchangerates",
    label: "Open Exchange Rates",
    description: "API comercial. Requer EXCHANGE_RATES_API_KEY.",
    external: true,
    requiresApiKey: true,
  },
  database: {
    id: "database",
    label: "Último valor no banco",
    description: "Fallback interno — mantém valores atuais.",
    external: false,
    requiresApiKey: false,
  },
  marketdata_auto: {
    id: "marketdata_auto",
    label: "Mercado automático (brapi + stooq + CoinGecko)",
    description:
      "Roteia por tipo de ativo: brapi (B3), stooq (ações globais), CoinGecko (cripto). Sem chave; BRAPI_API_KEY opcional.",
    external: true,
    requiresApiKey: false,
  },
} as const;

export type WorkerProviderId = keyof typeof WORKER_PROVIDERS;

export const WORKER_PROVIDER_OPTIONS = Object.values(WORKER_PROVIDERS).map((provider) => ({
  value: provider.id,
  label: provider.label,
  description: provider.description,
}));

export const WORKER_DEFINITIONS = {
  [WORKER_IDS.USD_RATE]: {
    id: WORKER_IDS.USD_RATE,
    name: "Taxas USD (moedas)",
    description: "Atualiza Currency.usdRate a partir de APIs externas de câmbio.",
    defaultPrimaryProvider: "frankfurter" as WorkerProviderId,
    defaultSecondaryProvider: "openexchangerates" as WorkerProviderId,
    allowedProviders: ["frankfurter", "openexchangerates", "database"] as WorkerProviderId[],
    defaultIntervalSeconds: 3600,
  },
  [WORKER_IDS.MARKET_QUOTES]: {
    id: WORKER_IDS.MARKET_QUOTES,
    name: "Cotações de mercado (ativos)",
    description:
      "Atualiza preços de ações, ETFs, FIIs e cripto cadastrados em MarketAsset e grava histórico.",
    defaultPrimaryProvider: "marketdata_auto" as WorkerProviderId,
    defaultSecondaryProvider: "database" as WorkerProviderId,
    allowedProviders: ["marketdata_auto", "database"] as WorkerProviderId[],
    defaultIntervalSeconds: 3600,
  },
  [WORKER_IDS.RECURRING_TXN]: {
    id: WORKER_IDS.RECURRING_TXN,
    name: "Lançamentos recorrentes",
    description:
      "Cria automaticamente os lançamentos a partir das recorrências vencidas de cada usuário.",
    defaultPrimaryProvider: "database" as WorkerProviderId,
    defaultSecondaryProvider: null,
    allowedProviders: ["database"] as WorkerProviderId[],
    defaultIntervalSeconds: 3600,
  },
} as const;

export function isWorkerProviderId(value: string): value is WorkerProviderId {
  return value in WORKER_PROVIDERS;
}

export function getWorkerDefinition(workerId: string) {
  return WORKER_DEFINITIONS[workerId as WorkerId] ?? null;
}

export function providerRequiresApiKey(providerId: string) {
  if (!isWorkerProviderId(providerId)) return false;
  return WORKER_PROVIDERS[providerId].requiresApiKey;
}

export function isProviderAvailable(providerId: string) {
  if (!isWorkerProviderId(providerId)) return false;
  if (providerId === "openexchangerates") {
    return Boolean(process.env.EXCHANGE_RATES_API_KEY?.trim());
  }
  return true;
}
