import { getMarketQuotes } from "@/lib/markets";
import type { MarketQuote } from "@/lib/types";

function fmt(n: number, digits = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function TickerRow({ quotes, hidden }: { quotes: MarketQuote[]; hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden}
      className="flex shrink-0 items-center gap-x-10 pr-10"
    >
      {quotes.map((q) => (
        <span key={q.symbol} className="label-caps flex items-center gap-2">
          <span>{q.label}</span>
          <span className="font-sans font-medium tracking-normal">
            {fmt(q.price)}
          </span>
          <span className={q.change >= 0 ? "text-[#7fd99a]" : "text-[#ff8a76]"}>
            {q.change >= 0 ? "+" : ""}
            {fmt(q.changePercent)}%
          </span>
        </span>
      ))}
    </div>
  );
}

export default async function Ticker() {
  const quotes = await getMarketQuotes();
  if (quotes.length === 0) return null;

  return (
    <div className="group bg-primary py-2 text-on-primary overflow-hidden">
      <div className="flex w-max animate-[ticker-scroll_36s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <TickerRow quotes={quotes} />
        <TickerRow quotes={quotes} hidden />
        <TickerRow quotes={quotes} hidden />
      </div>
    </div>
  );
}
