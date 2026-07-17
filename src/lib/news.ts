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

/** Normalized title key for cross-source dedup. */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort()
    .slice(0, 8)
    .join(" ");
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
  const seenTitles = new Set<string>();
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

      const tk = titleKey(item.title);
      if (tk && seenTitles.has(tk)) continue;

      // Quality gate: headline must be substantive
      if (item.title.length < 30 || !item.description || item.description.length < 40)
        continue;

      seenLinks.add(link);
      if (tk) seenTitles.add(tk);

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
    const list = byTopic
      .get(t)!
      .sort(
        (a, b) =>
          b.score - a.score ||
          +new Date(b.publishedAt) - +new Date(a.publishedAt),
      )
      .slice(0, PER_TOPIC_LIMIT);
    final.push(...list);
  }
  return final;
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
