import type { MarketQuote } from "./types";

const SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEBANK", label: "BANK NIFTY" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "NASDAQ" },
  { symbol: "INR=X", label: "USD/INR" },
  { symbol: "BZ=F", label: "BRENT" },
  { symbol: "GC=F", label: "GOLD" },
];

let cache: { at: number; quotes: MarketQuote[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function fetchQuote(symbol: string, label: string): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price: number | undefined = meta?.regularMarketPrice;
    const prev: number | undefined =
      meta?.chartPreviousClose ?? meta?.previousClose;
    if (price == null || prev == null || prev === 0) return null;
    const change = price - prev;
    return {
      symbol,
      label,
      price,
      change,
      changePercent: (change / prev) * 100,
    };
  } catch {
    return null;
  }
}

export async function getMarketQuotes(): Promise<MarketQuote[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.quotes;
  const results = await Promise.all(
    SYMBOLS.map((s) => fetchQuote(s.symbol, s.label)),
  );
  const quotes = results.filter((q): q is MarketQuote => q !== null);
  if (quotes.length > 0) cache = { at: Date.now(), quotes };
  return quotes.length > 0 ? quotes : (cache?.quotes ?? []);
}
