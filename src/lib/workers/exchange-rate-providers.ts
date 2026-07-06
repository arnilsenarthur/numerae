import {
  isProviderAvailable,
  type WorkerProviderId,
} from "@/lib/workers/registry";

/** USD per 1 unit of currency (same semantics as Currency.usdRate). */
export type UsdRateMap = Map<string, number>;

export type ProviderFetchResult = {
  provider: WorkerProviderId;
  rates: UsdRateMap;
  fetchedAt: Date;
  meta?: Record<string, unknown>;
};

export type ProviderFetchAttempt = {
  provider: WorkerProviderId;
  ok: boolean;
  error?: string;
};

const STABLE_USD_CODES = new Set(["USD", "USDT", "USDC"]);

export function isStableUsdCode(code: string) {
  return STABLE_USD_CODES.has(code.toUpperCase());
}

/** External APIs return "units of currency per 1 USD"; convert to usdRate. */
export function unitsPerUsdToUsdRate(unitsPerUsd: number) {
  if (!Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0) {
    throw new Error("Taxa inválida do provedor.");
  }
  return 1 / unitsPerUsd;
}

export async function fetchFrankfurterUsdRates(codes: string[]): Promise<ProviderFetchResult> {
  const symbols = [...new Set(codes.map((c) => c.toUpperCase()).filter((c) => !isStableUsdCode(c)))].join(
    ",",
  );

  const url =
    symbols.length > 0
      ? `https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(symbols)}`
      : "https://api.frankfurter.app/latest?from=USD&to=EUR";

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter retornou ${response.status}`);
  }

  const data = (await response.json()) as {
    date?: string;
    rates?: Record<string, number>;
  };

  const rates: UsdRateMap = new Map();
  rates.set("USD", 1);

  for (const code of codes) {
    const upper = code.toUpperCase();
    if (isStableUsdCode(upper)) {
      rates.set(upper, 1);
      continue;
    }

    const unitsPerUsd = data.rates?.[upper];
    if (unitsPerUsd === undefined) continue;
    rates.set(upper, unitsPerUsdToUsdRate(unitsPerUsd));
  }

  return {
    provider: "frankfurter",
    rates,
    fetchedAt: new Date(),
    meta: { date: data.date },
  };
}

export async function fetchOpenExchangeRatesUsdRates(
  codes: string[],
): Promise<ProviderFetchResult> {
  const apiKey = process.env.EXCHANGE_RATES_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("EXCHANGE_RATES_API_KEY não configurada.");
  }

  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(apiKey)}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    },
  );

  if (!response.ok) {
    throw new Error(`Open Exchange Rates retornou ${response.status}`);
  }

  const data = (await response.json()) as {
    timestamp?: number;
    rates?: Record<string, number>;
  };

  const apiRates = data.rates;
  if (!apiRates) {
    throw new Error("Open Exchange Rates retornou payload inválido.");
  }

  const rates: UsdRateMap = new Map();

  for (const code of codes) {
    const upper = code.toUpperCase();
    if (isStableUsdCode(upper)) {
      rates.set(upper, 1);
      continue;
    }

    const unitsPerUsd = apiRates[upper];
    if (unitsPerUsd === undefined) continue;
    rates.set(upper, unitsPerUsdToUsdRate(unitsPerUsd));
  }

  return {
    provider: "openexchangerates",
    rates,
    fetchedAt: new Date(),
    meta: { timestamp: data.timestamp },
  };
}

export function buildDatabaseFallbackRates(
  codes: string[],
  existing: UsdRateMap,
): ProviderFetchResult {
  const rates: UsdRateMap = new Map();

  for (const code of codes) {
    const upper = code.toUpperCase();
    if (isStableUsdCode(upper)) {
      rates.set(upper, 1);
      continue;
    }
    const current = existing.get(upper);
    if (current !== undefined) rates.set(upper, current);
  }

  return {
    provider: "database",
    rates,
    fetchedAt: new Date(),
    meta: { stale: true },
  };
}

export async function fetchUsdRatesFromProvider(
  providerId: WorkerProviderId,
  codes: string[],
  existingRates?: UsdRateMap,
): Promise<ProviderFetchResult> {
  switch (providerId) {
    case "frankfurter":
      return fetchFrankfurterUsdRates(codes);
    case "openexchangerates":
      return fetchOpenExchangeRatesUsdRates(codes);
    case "database":
      return buildDatabaseFallbackRates(codes, existingRates ?? new Map());
    default:
      throw new Error(`Provedor ${providerId} não suporta fetch externo de USD.`);
  }
}

export async function fetchUsdRatesWithFallback(input: {
  codes: string[];
  primaryProvider: WorkerProviderId;
  secondaryProvider?: WorkerProviderId | null;
  existingRates?: UsdRateMap;
}): Promise<{
  result: ProviderFetchResult;
  attempts: ProviderFetchAttempt[];
  fallbackUsed: boolean;
}> {
  const chain = [input.primaryProvider, input.secondaryProvider, "database" as WorkerProviderId].filter(
    (provider, index, list): provider is WorkerProviderId =>
      Boolean(provider) && list.indexOf(provider) === index,
  );

  const attempts: ProviderFetchAttempt[] = [];
  let fallbackUsed = false;
  let lastError: string | undefined;

  for (let index = 0; index < chain.length; index += 1) {
    const provider = chain[index]!;

    if (!isProviderAvailable(provider)) {
      attempts.push({
        provider,
        ok: false,
        error: "Provedor indisponível (configuração ausente).",
      });
      continue;
    }

    try {
      const result = await fetchUsdRatesFromProvider(
        provider,
        input.codes,
        input.existingRates,
      );

      if (result.rates.size === 0) {
        throw new Error("Nenhuma taxa retornada.");
      }

      attempts.push({ provider, ok: true });
      fallbackUsed = index > 0;

      return { result, attempts, fallbackUsed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      lastError = message;
      attempts.push({ provider, ok: false, error: message });
    }
  }

  throw new Error(lastError ?? "Todos os provedores falharam.");
}

/** Cross-rate: units of toCurrency per 1 fromCurrency. */
export function crossRateFromUsdRates(
  fromCurrency: string,
  toCurrency: string,
  usdRates: UsdRateMap,
) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  const fromUsd = isStableUsdCode(from) ? 1 : usdRates.get(from);
  const toUsd = isStableUsdCode(to) ? 1 : usdRates.get(to);

  if (fromUsd === undefined || toUsd === undefined || fromUsd <= 0 || toUsd <= 0) {
    return null;
  }

  return fromUsd / toUsd;
}
