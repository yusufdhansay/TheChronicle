import { promises as fs } from "fs";
import path from "path";
import Groq from "groq-sdk";
import type { Article } from "./types";
import { isNoiseText } from "./scrape";

/**
 * Article condenser.
 *
 * Takes the scraped paragraphs of a publisher page and produces a brief
 * of AT MOST 100 words containing only the news content — no ads, promos
 * or boilerplate (those are pre-filtered by scrape.ts, and the LLM is
 * instructed to ignore any that survive).
 *
 * Engine selection:
 * - `GROQ_API_KEY` set  → Groq LLM (llama-3.3-70b-versatile) writes an
 *   abstractive 100-word brief.
 * - No key / API error  → extractive fallback: leading sentences of the
 *   article (news follows the inverted pyramid, so the top carries the
 *   facts), cut at a sentence boundary before 100 words.
 *
 * Results are cached in `data/summaries.json` keyed by article id, so
 * each article is condensed exactly once.
 */

const MIN_WORDS = 60;
const MAX_WORDS = 100;
const CACHE_FILE = path.join(process.cwd(), "data", "summaries.json");
const MAX_CACHE_ENTRIES = 2000;

type SummaryCache = Record<string, { brief: string; engine: string; at: string }>;

let memCache: SummaryCache | null = null;

async function readCache(): Promise<SummaryCache> {
  if (memCache) return memCache;
  try {
    memCache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
  } catch {
    memCache = {};
  }
  return memCache!;
}

async function writeCache(cache: SummaryCache): Promise<void> {
  // Bound the file: drop oldest entries beyond the cap
  const entries = Object.entries(cache);
  if (entries.length > MAX_CACHE_ENTRIES) {
    entries.sort((a, b) => a[1].at.localeCompare(b[1].at));
    cache = Object.fromEntries(entries.slice(entries.length - MAX_CACHE_ENTRIES));
  }
  memCache = cache;
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  const tmp = `${CACHE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache), "utf8");
  await fs.rename(tmp, CACHE_FILE);
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Hard cap at MAX_WORDS, cutting at the last full sentence that fits. */
function capAtWordLimit(text: string): string {
  if (countWords(text) <= MAX_WORDS) return text.trim();
  // Split only at punctuation followed by whitespace and a sentence-like
  // start, so decimals ("grew by 10.5%") are never treated as boundaries
  const sentences = text.split(/(?<=[.!?]["'’”]?)\s+(?=[A-Z“"'‘₹$])/);
  const out: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const w = countWords(s);
    if (words + w > MAX_WORDS) break;
    out.push(s.trim());
    words += w;
  }
  if (out.length === 0) {
    return text.split(/\s+/).slice(0, MAX_WORDS).join(" ") + "…";
  }
  return out.join(" ").trim();
}

/**
 * Join scraped paragraphs into a single body, defensively re-filtering any
 * widget/boilerplate paragraph via the shared `isNoiseText()` judgement.
 */
function usableBody(paragraphs: string[]): string {
  return paragraphs.filter((p) => !isNoiseText(p)).join(" ").trim();
}

/**
 * Pick the text the brief should be built from: whichever of the cleaned
 * scraped body or the trimmed RSS summary yields MORE usable words. The RSS
 * summary wins ties/when longer; falls back to RSS when scraped is empty.
 */
function chooseBriefSource(paragraphs: string[], rssSummary: string): string {
  const scraped = usableBody(paragraphs);
  const rss = (rssSummary || "").trim();
  return countWords(rss) > countWords(scraped) ? rss : scraped || rss;
}

/**
 * Validate a produced brief: reject empty text, widget/boilerplate leakage,
 * over-long text, and short stubs when more content was available.
 */
function isValidBrief(
  text: string,
  opts: { moreContentAvailable: boolean },
): boolean {
  if (!text) return false;
  if (isNoiseText(text)) return false;
  const w = countWords(text);
  if (w > MAX_WORDS) return false;
  if (w < MIN_WORDS && opts.moreContentAvailable) return false;
  return true;
}

/** Extractive fallback: leading sentences up to the word limit. */
function extractiveBrief(paragraphs: string[], rssSummary: string): string {
  const body = chooseBriefSource(paragraphs, rssSummary);
  return capAtWordLimit(body);
}

async function groqBrief(
  article: Article,
  paragraphs: string[],
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Groq({ apiKey, timeout: 25_000, maxRetries: 1 });
    // Feed at most ~1200 words of body text — plenty for a 100-word brief.
    // Use the cleaned, best-available source (scraped-preferred, RSS fallback).
    const source = chooseBriefSource(paragraphs, article.summary);
    const body = (source || article.summary)
      .split(/\s+/)
      .slice(0, 1200)
      .join(" ");
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are a wire editor at a financial newspaper. You will receive text scraped from a news article page. It may contain leftover ads, promos, related-article links or site boilerplate — ignore those entirely. Write a condensed version of ONLY the news article in between 60 and 100 words. Preserve the key facts: who, what, figures, dates, regulator or company names, and any decisive quote. Plain prose, one or two paragraphs, no headline, no bullet points, no emojis, no commentary of your own.",
        },
        {
          role: "user",
          content: `Headline: ${article.title}\n\nScraped text:\n${body || article.summary}`,
        },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (!text || countWords(text) < 20) return null;
    return capAtWordLimit(text);
  } catch {
    return null;
  }
}

export interface Brief {
  paragraphs: string[];
  engine: "groq" | "extractive";
}

export async function condenseArticle(
  article: Article,
  scrapedParagraphs: string[],
): Promise<Brief> {
  const source = chooseBriefSource(scrapedParagraphs, article.summary);
  const moreContentAvailable = countWords(source) >= MIN_WORDS;

  const cache = await readCache();
  const hit = cache[article.id];
  // Serve the cache only when it still passes current validation; otherwise
  // fall through and regenerate (self-heal on read).
  if (hit && isValidBrief(hit.brief, { moreContentAvailable })) {
    return {
      paragraphs: hit.brief.split(/\n{2,}/).filter(Boolean),
      engine: hit.engine === "groq" ? "groq" : "extractive",
    };
  }

  const fromGroq = await groqBrief(article, scrapedParagraphs);
  const brief =
    fromGroq ?? extractiveBrief(scrapedParagraphs, article.summary);
  const engine = fromGroq ? "groq" : "extractive";

  // Persist only valid briefs; skip the write so an invalid one is retried on
  // next load (self-heal on write).
  if (isValidBrief(brief, { moreContentAvailable })) {
    try {
      await writeCache({
        ...cache,
        [article.id]: { brief, engine, at: new Date().toISOString() },
      });
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return { paragraphs: brief.split(/\n{2,}/).filter(Boolean), engine };
}
