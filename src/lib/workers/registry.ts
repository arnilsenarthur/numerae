export const WORKER_IDS = {
  USD_RATE: "usd_rate",
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
