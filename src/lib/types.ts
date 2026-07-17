export const TOPICS = [
  "finance-banking",
  "markets",
  "ipos-listings",
  "ma",
  "pe-vc",
  "investment-banking",
  "economy-policy",
  "geopolitics",
] as const;

export type TopicSlug = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<TopicSlug, string> = {
  "finance-banking": "Finance & Banking",
  markets: "Markets",
  "ipos-listings": "IPOs & Listings",
  ma: "M&A",
  "pe-vc": "Private Equity & VC",
  "investment-banking": "Investment Banking",
  "economy-policy": "Economy & Policy",
  geopolitics: "Geopolitics",
};

export const TOPIC_DESCRIPTIONS: Record<TopicSlug, string> = {
  "finance-banking":
    "Banking, NBFCs, insurance and the institutions that move India's money.",
  markets:
    "Equities, bonds, currencies and commodities — the daily pulse of capital.",
  "ipos-listings":
    "Public issues, listings, GMPs and the primary market calendar.",
  ma: "Mergers, acquisitions, takeovers and the deals reshaping industries.",
  "pe-vc":
    "Private equity, venture capital, funding rounds and exits.",
  "investment-banking":
    "Deal advisory, underwriting, block trades and the Street's fee machine.",
  "economy-policy":
    "GDP, inflation, RBI, fiscal policy and the levers of the economy.",
  geopolitics:
    "Trade, sanctions, diplomacy and the global forces moving markets.",
};

export interface Article {
  id: string; // stable hash of the link
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string; // ISO
  topic: TopicSlug;
  score: number; // quality/relevance score
  image?: string; // lead image from the feed, when provided
}

export interface BriefItem {
  industry: string; // e.g. "Tech", "Energy", "Auto", "Pharma"
  bold: string; // the leading bold fragment
  rest: string;
  link: string;
  source: string;
}

export interface Edition {
  fetchedAt: string; // ISO timestamp of when this edition was assembled
  date: string; // YYYY-MM-DD (IST) the edition belongs to
  articles: Article[];
  briefs: BriefItem[];
}

export interface MarketQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}
