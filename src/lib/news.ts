import { createHash } from "crypto";
import { NEWS_FEEDS, BRIEF_FEEDS } from "./feeds";
import { parseRss } from "./rss";
import { classify, isNoise } from "./classify";
import type { Article, BriefItem, Edition, TopicSlug } from "./types";
import { TOPICS } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_AGE_HOURS = 36; // ignore stale items
const PER_TOPIC_LIMIT = 14;

async function fetchXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (TheChronicle/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function hashId(link: string): string {
  return createHash("sha1").update(link).digest("hex").slice(0, 12);
}

/**
 * Cross-source de-duplication.
 *
 * A single event (e.g. "Kotak Bank Q1 results") is reported by ET, Mint and
 * BusinessLine with different figures and verbs ("rises 22.5% to ₹5,480" vs
 * "climbs 26% to Rs 4,123"). A brittle exact-signature key never matches those,
 * so the paper showed the same story three times. Instead we compare stories on
 * two axes:
 *   • SUBJECT — the distinctive tokens (named entities), ignoring generic
 *     finance filler ("bank", "profit", "results") and pure numbers, which are
 *     what actually differ between two unrelated banks.
 *   • CONTENT — the overall significant-token overlap, which stays high for the
 *     same event and drops for different events about the same company.
 * Two stories are duplicates only when BOTH the subject and the content align.
 */

/** Grammatical words carrying no topical signal — dropped from every comparison. */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "its", "our", "out",
  "who", "get", "has", "him", "his", "how", "new", "now", "was", "with", "over",
  "from", "into", "after", "amid", "says", "said", "than", "that", "this", "will",
  "been", "have", "more", "most", "also", "per", "amp", "one", "two", "may",
]);

/**
 * Generic finance vocabulary that recurs across unrelated stories. Kept for the
 * CONTENT comparison (same-event stories share these) but excluded from the
 * SUBJECT comparison so "Kotak" and "Axis" are not treated as the same subject
 * just because both say "bank profit results crore".
 */
const GENERIC = new Set([
  "bank", "banks", "result", "results", "net", "gross", "profit", "profits",
  "loss", "losses", "rises", "rise", "rose", "jumps", "jump", "jumped", "surges",
  "surge", "surged", "climbs", "climb", "climbed", "gains", "gain", "gained",
  "falls", "fall", "fell", "slips", "slip", "drops", "drop", "posts", "post",
  "reports", "report", "reported", "logs", "sees", "seen", "quarter", "quarterly",
  "earnings", "revenue", "income", "margin", "margins", "profits", "growth",
  "shares", "share", "stock", "stocks", "price", "prices", "percent", "cent",
  "rupee", "rupees", "company", "firm", "update", "updates", "latest", "today",
  "fiscal", "year", "annual", "crore", "crores", "lakh", "billion", "million",
  "high", "low", "record", "deal", "cr", "yoy", "qoq", "nii", "eps",
  // Earnings descriptors: qualify a result without identifying whose it is.
  "operating", "standalone", "consolidated", "advances", "advance", "declines",
  "widens", "narrows", "misses", "beats", "tops", "doubles", "estimates",
  "estimate", "expectations", "provisions", "provisioning", "disbursements",
]);

/** Significant tokens: length ≥ 3, not a number, not a grammatical stopword. */
function sigTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d/.test(w) && !STOPWORDS.has(w));
}

/** Acronyms written out literally in a headline (e.g. "PNB", "LIC", "IRDAI"). */
function literalAcronyms(title: string): Set<string> {
  return new Set(
    (title.match(/\b[A-Z]{3,6}\b/g) ?? []).map((w) => w.toLowerCase()),
  );
}

/** Acronyms implied by a run of ≥3 capitalised words (e.g. "Punjab National Bank" → "pnb"). */
function derivedAcronyms(title: string): Set<string> {
  const out = new Set<string>();
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) out.add(run.map((w) => w[0].toLowerCase()).join(""));
    run = [];
  };
  for (const w of title.split(/\s+/)) {
    if (/^[A-Z][a-zA-Z]+$/.test(w)) run.push(w);
    else flush();
  }
  flush();
  return out;
}

/**
 * The story's subject — the organisation it is about. News headlines lead with
 * their subject ("ICICI Bank Q1 Results: …", "Yes Bank Q1 …"), so we read the
 * opening run of capitalised name words and stop at the first lowercase word or
 * number (typically "Q1"/"results"). This deliberately ignores trailing verbs
 * and metrics ("margins expand", "operating profit") that would otherwise make
 * two reports of the same result look like different subjects.
 */
function leadEntity(title: string): Set<string> {
  const ent: string[] = [];
  for (const w of title.split(/\s+/)) {
    const c = w.replace(/[^A-Za-z0-9]/g, "");
    if (c && /^[A-Z]/.test(c) && !/\d/.test(c)) {
      ent.push(c.toLowerCase());
      if (ent.length >= 4) break;
    } else break;
  }
  return new Set(
    ent.filter((w) => w.length >= 3 && !GENERIC.has(w) && !STOPWORDS.has(w)),
  );
}

interface Sig {
  all: Set<string>; // full significant tokens (content axis)
  body: Set<string>; // distinctive tokens (content minus generic finance filler)
  key: Set<string>; // leading-entity tokens (subject axis)
  lit: Set<string>; // acronyms spelled out literally (e.g. "PNB")
  der: Set<string>; // acronyms implied by a capitalised name run
  earn: boolean; // whether the headline is a quarterly-results story
}

function buildSig(title: string): Sig {
  const toks = sigTokens(title);
  return {
    all: new Set(toks),
    body: new Set(toks.filter((w) => !GENERIC.has(w))),
    key: leadEntity(title),
    lit: literalAcronyms(title),
    der: derivedAcronyms(title),
    earn: isEarnings(title),
  };
}

/** True when one headline abbreviates an organisation the other spells out. */
function sharesAcronym(a: Sig, b: Sig): boolean {
  for (const x of a.lit) if (b.der.has(x)) return true;
  for (const x of b.lit) if (a.der.has(x)) return true;
  return false;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** True when `s` describes the same event as any already-accepted story. */
function isDuplicate(s: Sig, accepted: Sig[]): boolean {
  for (const prev of accepted) {
    const content = jaccard(s.all, prev.all);
    const subject = s.key.size && prev.key.size ? jaccard(s.key, prev.key) : 0;
    if (subject >= 0.6 && content >= 0.4) {
      // Same subject + strongly overlapping content ⇒ same story.
      return true;
    }
    if (subject >= 0.6 && s.earn && prev.earn && content >= 0.25) {
      // Same company's quarterly result reported twice — a firm reports a given
      // quarter once, so differing phrasing/figures across sources is one event.
      return true;
    }
    if (sharesAcronym(s, prev) && content >= 0.3) {
      // One source uses the acronym, another the full name (PNB vs Punjab National Bank).
      return true;
    }
    if (jaccard(s.body, prev.body) >= 0.6) {
      // Near-identical wording once the earnings/market boilerplate is removed —
      // catches re-framings the subject axis misses (parent vs subsidiary/deal),
      // while different companies' results (no shared distinctive tokens) stay apart.
      return true;
    }
  }
  return false;
}

function cleanSummary(raw: string, title: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  // Some feeds repeat the headline in the description
  if (s.toLowerCase().startsWith(title.toLowerCase())) {
    s = s.slice(title.length).replace(/^[\s:.\-–—]+/, "");
  }
  if (s.length > 320) {
    const cut = s.slice(0, 320);
    s = cut.slice(0, Math.max(cut.lastIndexOf(". ") + 1, cut.lastIndexOf(" "))).trim();
    if (!/[.!?]$/.test(s)) s += "…";
  }
  return s;
}

export async function fetchNews(): Promise<Article[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const xml = await fetchXml(feed.url);
      if (!xml) return [];
      return parseRss(xml).map((item) => ({ item, feed }));
    }),
  );

  const now = Date.now();
  const seenLinks = new Set<string>();
  const seenSigs: Sig[] = [];
  const articles: Article[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const { item, feed } of r.value) {
      const published = item.pubDate ? new Date(item.pubDate) : new Date();
      if (isNaN(published.getTime())) continue;
      const ageHours = (now - published.getTime()) / 36e5;
      if (ageHours > MAX_AGE_HOURS || ageHours < -2) continue;

      const link = item.link.split("?")[0];
      if (seenLinks.has(link)) continue;

      const text = `${item.title}. ${item.description}`;
      const cls = classify(text, feed.topicHint);
      if (!cls) continue;

      // Quality gate: headline must be substantive
      if (item.title.length < 30 || !item.description || item.description.length < 40)
        continue;

      // Cross-source dedup: skip stories describing an already-seen event.
      const sig = buildSig(item.title);
      if (isDuplicate(sig, seenSigs)) continue;

      seenLinks.add(link);
      seenSigs.push(sig);

      // Recency bonus keeps the paper fresh
      const recency = ageHours < 3 ? 2 : ageHours < 8 ? 1 : 0;

      articles.push({
        id: hashId(link),
        title: item.title,
        summary: cleanSummary(item.description, item.title),
        link: item.link,
        source: feed.source,
        publishedAt: published.toISOString(),
        topic: cls.topic,
        score: cls.score + recency,
        image: item.image,
      });
    }
  }

  // Rank within topic, cap per topic
  const byTopic = new Map<TopicSlug, Article[]>();
  for (const t of TOPICS) byTopic.set(t, []);
  for (const a of articles) byTopic.get(a.topic)!.push(a);

  const final: Article[] = [];
  for (const t of TOPICS) {
    const ranked = byTopic
      .get(t)!
      .sort(
        (a, b) =>
          b.score - a.score ||
          +new Date(b.publishedAt) - +new Date(a.publishedAt),
      );
    final.push(...diversify(ranked));
  }
  return final;
}

/** Company/entity key used to stop one name from monopolising a section. */
function entityKey(title: string): string {
  const key = sigTokens(title)
    .filter((w) => !GENERIC.has(w))
    .slice(0, 2)
    .join(" ");
  return key || `~${title.slice(0, 24)}`; // fall back to a per-story key
}

/** Quarterly-earnings stories — the cluster that floods finance during results season. */
function isEarnings(title: string): boolean {
  return /\bq[1-4]\b|\bresults?\b|\bnet profit\b|\bearnings\b|\bprofit (?:rises?|jumps?|surges?|climbs?|falls?|drops?|up|down)\b/i.test(
    title,
  );
}

/**
 * Enforce topical variety within a section. A ranked list dominated by the same
 * company or by a wall of quarterly results reads as monotonous even after
 * de-duplication (e.g. Kotak, Axis, Yes, PNB all reporting Q1 on the same day).
 * We admit stories greedily by score while capping repeats, then run fill passes
 * so the section is never left short.
 */
function diversify(ranked: Article[]): Article[] {
  const ENTITY_CAP = 2; // at most 2 stories about the same company
  const EARNINGS_CAP = 5; // at most 5 quarterly-results stories per section

  const picked: Article[] = [];
  const used = new Set<string>();
  const entityCount = new Map<string, number>();
  let earnings = 0;

  const tryAdd = (
    a: Article,
    limits: { entity: boolean; earnings: boolean },
  ): boolean => {
    if (used.has(a.id) || picked.length >= PER_TOPIC_LIMIT) return false;
    const ek = entityKey(a.title);
    if (limits.entity && (entityCount.get(ek) ?? 0) >= ENTITY_CAP) return false;
    const earn = isEarnings(a.title);
    if (limits.earnings && earn && earnings >= EARNINGS_CAP) return false;
    picked.push(a);
    used.add(a.id);
    entityCount.set(ek, (entityCount.get(ek) ?? 0) + 1);
    if (earn) earnings++;
    return true;
  };

  // Pass 1: full diversity constraints.
  for (const a of ranked) tryAdd(a, { entity: true, earnings: true });
  // Pass 2: relax the earnings cap to backfill if variety left the section short.
  if (picked.length < PER_TOPIC_LIMIT)
    for (const a of ranked) tryAdd(a, { entity: true, earnings: false });
  // Pass 3: last resort — fill remaining slots ignoring all caps.
  if (picked.length < PER_TOPIC_LIMIT)
    for (const a of ranked) tryAdd(a, { entity: false, earnings: false });

  return picked;
}

export async function fetchBriefs(): Promise<BriefItem[]> {
  const results = await Promise.allSettled(
    BRIEF_FEEDS.map(async (feed) => {
      const xml = await fetchXml(feed.url);
      if (!xml) return [];
      return parseRss(xml)
        .slice(0, 10)
        .map((item) => ({ item, feed }));
    }),
  );

  const byIndustry = new Map<string, BriefItem[]>();
  const now = Date.now();

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const { item, feed } of r.value) {
      const industry = feed.briefIndustry!;
      const published = item.pubDate ? new Date(item.pubDate) : new Date();
      if ((now - published.getTime()) / 36e5 > MAX_AGE_HOURS) continue;
      if (isNoise(`${item.title}. ${item.description}`)) continue;
      if (item.title.length < 30) continue;

      // Split headline into a bold lead (first few words) + rest,
      // mirroring the "Apple quietly expands…" brief style in the design.
      const words = item.title.split(" ");
      const bold = words.slice(0, 2).join(" ");
      const rest = words.slice(2).join(" ");

      const list = byIndustry.get(industry) ?? [];
      if (list.length >= 3) continue;
      list.push({ industry, bold, rest, link: item.link, source: feed.source });
      byIndustry.set(industry, list);
    }
  }

  const briefs: BriefItem[] = [];
  for (const list of byIndustry.values()) briefs.push(...list);
  return briefs;
}

/** Current date in IST as YYYY-MM-DD. */
export function istDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function buildEdition(): Promise<Edition> {
  const [articles, briefs] = await Promise.all([fetchNews(), fetchBriefs()]);
  return {
    fetchedAt: new Date().toISOString(),
    date: istDate(),
    articles,
    briefs,
  };
}
