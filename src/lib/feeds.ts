import type { TopicSlug } from "./types";

export interface FeedDef {
  url: string;
  source: string;
  /** Topic hint from the feed itself; classifier can override. */
  topicHint?: TopicSlug;
  /** Feeds used only for the cross-industry briefs strip. */
  briefIndustry?: string;
}

/**
 * Only established, widely-trusted Indian financial news providers.
 * Topic-scoped feeds are preferred so classification starts from a
 * strong prior instead of guessing from generic business feeds.
 */
export const NEWS_FEEDS: FeedDef[] = [
  // ── Economic Times ────────────────────────────────────────────────
  {
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    source: "Economic Times",
    topicHint: "markets",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/banking/finance/rssfeeds/13358259.cms",
    source: "Economic Times",
    topicHint: "finance-banking",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/banking/finance/banking/rssfeeds/13358319.cms",
    source: "Economic Times",
    topicHint: "finance-banking",
  },
  {
    url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms",
    source: "Economic Times",
    topicHint: "economy-policy",
  },
  {
    url: "https://economictimes.indiatimes.com/markets/ipos/fpos/rssfeeds/14655708.cms",
    source: "Economic Times",
    topicHint: "ipos-listings",
  },
  {
    url: "https://economictimes.indiatimes.com/news/international/world-news/rssfeeds/858478126.cms",
    source: "Economic Times",
    topicHint: "geopolitics",
  },

  // ── Mint ──────────────────────────────────────────────────────────
  {
    url: "https://www.livemint.com/rss/markets",
    source: "Mint",
    topicHint: "markets",
  },
  {
    url: "https://www.livemint.com/rss/economy",
    source: "Mint",
    topicHint: "economy-policy",
  },
  {
    url: "https://www.livemint.com/rss/companies",
    source: "Mint",
  },
  {
    url: "https://www.livemint.com/rss/money",
    source: "Mint",
    topicHint: "finance-banking",
  },
  {
    // Insurance / IRDAI coverage — diversifies finance beyond retail bank results.
    url: "https://www.livemint.com/rss/insurance",
    source: "Mint",
    topicHint: "finance-banking",
  },

  // ── Moneycontrol ──────────────────────────────────────────────────
  {
    url: "https://www.moneycontrol.com/rss/business.xml",
    source: "Moneycontrol",
  },
  {
    url: "https://www.moneycontrol.com/rss/iponews.xml",
    source: "Moneycontrol",
    topicHint: "ipos-listings",
  },
  {
    url: "https://www.moneycontrol.com/rss/marketreports.xml",
    source: "Moneycontrol",
    topicHint: "markets",
  },
  {
    url: "https://www.moneycontrol.com/rss/economy.xml",
    source: "Moneycontrol",
    topicHint: "economy-policy",
  },

  // ── The Hindu / BusinessLine ──────────────────────────────────────
  {
    url: "https://www.thehindubusinessline.com/markets/feeder/default.rss",
    source: "The Hindu BusinessLine",
    topicHint: "markets",
  },
  {
    url: "https://www.thehindubusinessline.com/money-and-banking/feeder/default.rss",
    source: "The Hindu BusinessLine",
    topicHint: "finance-banking",
  },
  {
    url: "https://www.thehindubusinessline.com/economy/feeder/default.rss",
    source: "The Hindu BusinessLine",
    topicHint: "economy-policy",
  },
  {
    url: "https://www.thehindu.com/business/Economy/feeder/default.rss",
    source: "The Hindu",
    topicHint: "economy-policy",
  },

  // ── Times of India ────────────────────────────────────────────────
  {
    url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms",
    source: "Times of India",
  },
];

/** Feeds powering the cross-industry briefs strip (Tech / Energy / Auto / Pharma …). */
export const BRIEF_FEEDS: FeedDef[] = [
  {
    url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms",
    source: "Economic Times",
    briefIndustry: "Tech",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/energy/rssfeeds/13358361.cms",
    source: "Economic Times",
    briefIndustry: "Energy",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/auto/rssfeeds/13359412.cms",
    source: "Economic Times",
    briefIndustry: "Auto",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/healthcare/biotech/rssfeeds/13358050.cms",
    source: "Economic Times",
    briefIndustry: "Pharma & Healthcare",
  },
  {
    url: "https://economictimes.indiatimes.com/industry/cons-products/rssfeeds/13358365.cms",
    source: "Economic Times",
    briefIndustry: "Consumer",
  },
  {
    url: "https://www.thehindubusinessline.com/info-tech/feeder/default.rss",
    source: "The Hindu BusinessLine",
    briefIndustry: "Tech",
  },
];
