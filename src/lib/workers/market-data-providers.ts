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
