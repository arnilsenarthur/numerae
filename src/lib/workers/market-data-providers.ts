/**
 * Providers gratuitos de cotações de mercado:
 * - Yahoo Finance (chart API) — ações globais, B3 (sufixo .SA), ETFs e índices; sem chave
 * - brapi.dev — ações/FIIs/ETFs da B3; usado quando BRAPI_API_KEY está configurada
 * - CoinGecko — criptomoedas, sem chave (free tier)
 */

export type MarketPriceResult = {
  symbol: string;
  price: number;
  changePercent: number | null;
  currencyCode: string | null;
};

export type MarketAssetRef = {
  symbol: string;
  kind: string;
  currencyCode: string;
  countryCode: string | null;
};

function isBrazilAsset(asset: MarketAssetRef) {
  return asset.countryCode === "BR" || /\d$/.test(asset.symbol);
}

export async function fetchBrapiQuotes(symbols: string[]): Promise<MarketPriceResult[]> {
  if (symbols.length === 0) return [];

  const token = process.env.BRAPI_API_KEY?.trim();
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbols.join(","))}${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`brapi retornou ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: {
      symbol?: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
      currency?: string;
    }[];
  };

  const results: MarketPriceResult[] = [];
  for (const item of data.results ?? []) {
    if (!item.symbol || typeof item.regularMarketPrice !== "number") continue;
    results.push({
      symbol: item.symbol.toUpperCase(),
      price: item.regularMarketPrice,
      changePercent:
        typeof item.regularMarketChangePercent === "number"
          ? item.regularMarketChangePercent
          : null,
      currencyCode: item.currency ?? "BRL",
    });
  }
  return results;
}

/** Símbolo Yahoo: B3 usa sufixo .SA; índices e demais passam direto. */
function yahooSymbol(asset: MarketAssetRef) {
  const symbol = asset.symbol.toUpperCase();
  if (symbol.startsWith("^") || symbol.includes(".")) return symbol;
  if (isBrazilAsset(asset)) return `${symbol}.SA`;
  return symbol;
}

async function fetchYahooQuote(asset: MarketAssetRef): Promise<MarketPriceResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol(asset),
  )}?range=1d&interval=1d`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo retornou ${response.status} para ${asset.symbol}`);
  }

  const data = (await response.json()) as {
    chart?: {
      result?: {
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          currency?: string;
        };
      }[];
    };
  };

  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || price <= 0) return null;

  const previous = meta?.chartPreviousClose ?? meta?.previousClose;
  const changePercent =
    typeof previous === "number" && previous > 0 ? ((price - previous) / previous) * 100 : null;

  return {
    symbol: asset.symbol.toUpperCase(),
    price,
    changePercent,
    currencyCode: meta?.currency ?? null,
  };
}

const YAHOO_BATCH_SIZE = 6;

export async function fetchYahooQuotes(
  assets: MarketAssetRef[],
): Promise<{ results: MarketPriceResult[]; errors: string[] }> {
  const results: MarketPriceResult[] = [];
  const errors: string[] = [];

  for (let index = 0; index < assets.length; index += YAHOO_BATCH_SIZE) {
    const batch = assets.slice(index, index + YAHOO_BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map((asset) => fetchYahooQuote(asset)));

    settled.forEach((outcome, batchIndex) => {
      if (outcome.status === "fulfilled") {
        if (outcome.value) results.push(outcome.value);
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : "Erro desconhecido.";
        errors.push(`yahoo (${batch[batchIndex]!.symbol}): ${message}`);
      }
    });
  }

  return { results, errors };
}

/** Mapa símbolo → id CoinGecko para as criptos mais comuns. */
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  LTC: "litecoin",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
};

export async function fetchCoinGeckoQuotes(symbols: string[]): Promise<MarketPriceResult[]> {
  const ids = symbols
    .map((symbol) => ({ symbol: symbol.toUpperCase(), id: COINGECKO_IDS[symbol.toUpperCase()] }))
    .filter((item): item is { symbol: string; id: string } => Boolean(item.id));

  if (ids.length === 0) return [];

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids.map((item) => item.id).join(","),
  )}&vs_currencies=usd&include_24hr_change=true`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko retornou ${response.status}`);
  }

  const data = (await response.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;

  const results: MarketPriceResult[] = [];
  for (const item of ids) {
    const entry = data[item.id];
    if (!entry || typeof entry.usd !== "number") continue;
    results.push({
      symbol: item.symbol,
      price: entry.usd,
      changePercent:
        typeof entry.usd_24h_change === "number" ? entry.usd_24h_change : null,
      currencyCode: "USD",
    });
  }
  return results;
}

export type MarketFetchOutcome = {
  results: MarketPriceResult[];
  errors: string[];
};

export type MarketHistoryPoint = {
  symbol: string;
  quotedAt: Date;
  price: number;
};

export type MarketHistoryOutcome = {
  historyBySymbol: Map<string, MarketHistoryPoint[]>;
  errors: string[];
};

export type IntradayPeriod = "1D" | "1W";

/** Roteia cada ativo para o provider certo e agrega resultados. */
export async function fetchMarketQuotesAuto(
  assets: MarketAssetRef[],
): Promise<MarketFetchOutcome> {
  const crypto = assets.filter((asset) => asset.kind === "CRYPTO");
  const nonCrypto = assets.filter((asset) => asset.kind !== "CRYPTO");

  const hasBrapiKey = Boolean(process.env.BRAPI_API_KEY?.trim());
  const brazil = hasBrapiKey ? nonCrypto.filter(isBrazilAsset) : [];
  const viaYahoo = hasBrapiKey ? nonCrypto.filter((asset) => !isBrazilAsset(asset)) : nonCrypto;

  const results: MarketPriceResult[] = [];
  const errors: string[] = [];

  const [yahooOutcome, brapiOutcome, coingeckoOutcome] = await Promise.allSettled([
    fetchYahooQuotes(viaYahoo),
    fetchBrapiQuotes(brazil.map((asset) => asset.symbol)),
    fetchCoinGeckoQuotes(crypto.map((asset) => asset.symbol)),
  ]);

  if (yahooOutcome.status === "fulfilled") {
    results.push(...yahooOutcome.value.results);
    errors.push(...yahooOutcome.value.errors);
  } else {
    errors.push(
      `yahoo: ${yahooOutcome.reason instanceof Error ? yahooOutcome.reason.message : "Erro desconhecido."}`,
    );
  }

  if (brapiOutcome.status === "fulfilled") {
    results.push(...brapiOutcome.value);
  } else if (brazil.length > 0) {
    errors.push(
      `brapi: ${brapiOutcome.reason instanceof Error ? brapiOutcome.reason.message : "Erro desconhecido."}`,
    );
  }

  if (coingeckoOutcome.status === "fulfilled") {
    results.push(...coingeckoOutcome.value);
  } else if (crypto.length > 0) {
    errors.push(
      `coingecko: ${coingeckoOutcome.reason instanceof Error ? coingeckoOutcome.reason.message : "Erro desconhecido."}`,
    );
  }

  return { results, errors };
}

async function fetchYahooHistory(asset: MarketAssetRef): Promise<MarketHistoryPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol(asset),
  )}?range=1y&interval=1d`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo histórico retornou ${response.status} para ${asset.symbol}`);
  }

  const data = (await response.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const points: MarketHistoryPoint[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const ts = timestamps[index];
    const close = closes[index];
    if (!ts || typeof close !== "number" || close <= 0) continue;
    points.push({
      symbol: asset.symbol.toUpperCase(),
      quotedAt: new Date(ts * 1000),
      price: close,
    });
  }
  return points;
}

async function fetchCoinGeckoHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return [];

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id,
  )}/market_chart?vs_currency=usd&days=365&interval=daily`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko histórico retornou ${response.status} para ${symbol}`);
  }

  const data = (await response.json()) as { prices?: [number, number][] };
  const points: MarketHistoryPoint[] = [];
  for (const item of data.prices ?? []) {
    const [ms, price] = item;
    if (typeof ms !== "number" || typeof price !== "number" || price <= 0) continue;
    points.push({
      symbol: symbol.toUpperCase(),
      quotedAt: new Date(ms),
      price,
    });
  }
  return points;
}

export async function fetchMarketHistoryAuto(
  assets: MarketAssetRef[],
): Promise<MarketHistoryOutcome> {
  const historyBySymbol = new Map<string, MarketHistoryPoint[]>();
  const errors: string[] = [];

  const crypto = assets.filter((asset) => asset.kind === "CRYPTO");
  const nonCrypto = assets.filter((asset) => asset.kind !== "CRYPTO");

  for (let index = 0; index < nonCrypto.length; index += YAHOO_BATCH_SIZE) {
    const batch = nonCrypto.slice(index, index + YAHOO_BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map((asset) => fetchYahooHistory(asset)));
    settled.forEach((outcome, batchIndex) => {
      const asset = batch[batchIndex];
      if (!asset) return;
      if (outcome.status === "fulfilled") {
        historyBySymbol.set(asset.symbol.toUpperCase(), outcome.value);
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : "Erro desconhecido.";
        errors.push(`yahoo-history (${asset.symbol}): ${message}`);
      }
    });
  }

  const cryptoSettled = await Promise.allSettled(
    crypto.map((asset) => fetchCoinGeckoHistory(asset.symbol)),
  );
  cryptoSettled.forEach((outcome, index) => {
    const asset = crypto[index];
    if (!asset) return;
    if (outcome.status === "fulfilled") {
      historyBySymbol.set(asset.symbol.toUpperCase(), outcome.value);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "Erro desconhecido.";
      errors.push(`coingecko-history (${asset.symbol}): ${message}`);
    }
  });

  return { historyBySymbol, errors };
}

function downsampleByMinSpacing(points: MarketHistoryPoint[], minSpacingMs: number) {
  const sorted = [...points].sort((a, b) => a.quotedAt.getTime() - b.quotedAt.getTime());
  if (sorted.length <= 2) return sorted;

  const result: MarketHistoryPoint[] = [sorted[0]!];
  let lastTime = sorted[0]!.quotedAt.getTime();

  for (let index = 1; index < sorted.length - 1; index += 1) {
    const point = sorted[index]!;
    const time = point.quotedAt.getTime();
    if (time - lastTime >= minSpacingMs) {
      result.push(point);
      lastTime = time;
    }
  }

  const last = sorted[sorted.length - 1]!;
  if (result[result.length - 1]!.quotedAt.getTime() !== last.quotedAt.getTime()) {
    result.push(last);
  }

  return result;
}

async function fetchYahooIntraday(
  asset: MarketAssetRef,
  period: IntradayPeriod,
): Promise<MarketHistoryPoint[]> {
  const isOneDay = period === "1D";
  const range = isOneDay ? "1d" : "7d";
  const interval = isOneDay ? "30m" : "60m";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol(asset),
  )}?range=${range}&interval=${interval}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo intraday retornou ${response.status} para ${asset.symbol}`);
  }

  const data = (await response.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points: MarketHistoryPoint[] = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const ts = timestamps[index];
    const close = closes[index];
    if (!ts || typeof close !== "number" || close <= 0) continue;
    points.push({
      symbol: asset.symbol.toUpperCase(),
      quotedAt: new Date(ts * 1000),
      price: close,
    });
  }

  return isOneDay ? points : downsampleByMinSpacing(points, 2 * 60 * 60 * 1000);
}

async function fetchCoinGeckoIntraday(
  symbol: string,
  period: IntradayPeriod,
): Promise<MarketHistoryPoint[]> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return [];

  const days = period === "1D" ? 1 : 7;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id,
  )}/market_chart?vs_currency=usd&days=${days}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko intraday retornou ${response.status} para ${symbol}`);
  }

  const data = (await response.json()) as { prices?: [number, number][] };
  const points: MarketHistoryPoint[] = [];

  for (const item of data.prices ?? []) {
    const [ms, price] = item;
    if (typeof ms !== "number" || typeof price !== "number" || price <= 0) continue;
    points.push({
      symbol: symbol.toUpperCase(),
      quotedAt: new Date(ms),
      price,
    });
  }

  return period === "1D"
    ? downsampleByMinSpacing(points, 30 * 60 * 1000)
    : downsampleByMinSpacing(points, 2 * 60 * 60 * 1000);
}

export async function fetchMarketIntradayAuto(
  assets: MarketAssetRef[],
  period: IntradayPeriod,
): Promise<MarketHistoryOutcome> {
  const historyBySymbol = new Map<string, MarketHistoryPoint[]>();
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    assets.map(async (asset) => {
      const points =
        asset.kind === "CRYPTO"
          ? await fetchCoinGeckoIntraday(asset.symbol, period)
          : await fetchYahooIntraday(asset, period);
      return { symbol: asset.symbol.toUpperCase(), points };
    }),
  );

  settled.forEach((outcome, index) => {
    const asset = assets[index];
    if (!asset) return;
    if (outcome.status === "fulfilled") {
      historyBySymbol.set(outcome.value.symbol, outcome.value.points);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "Erro desconhecido.";
      errors.push(`intraday (${asset.symbol}): ${message}`);
    }
  });

  return { historyBySymbol, errors };
}
