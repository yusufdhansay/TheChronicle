# Design Document

## Overview

The article page (`/article/[id]`) renders "The Brief" — the source article
condensed to a short block. A bug lets publisher chrome (e.g. the audio widget
label "Listen to this article in summarized format") leak into the brief, and a
cached bad brief keeps showing. This design corrects three layers:

1. **Extraction** (`src/lib/scrape.ts`): recognize and drop player/audio/promo
   widget paragraphs so they never enter the article body.
2. **Condensation** (`src/lib/summarize.ts`): enforce a 60–100 word brief,
   choose the best content source (scraped vs RSS), validate the output, and
   avoid caching (and self-heal) invalid briefs.
3. **Presentation** (`src/app/article/[id]/page.tsx`): keep a clean reading
   order (title → 1–2 line summary → brief) and label the brief honestly.

The design reuses the existing Groq/extractive engine selection and the existing
atomic, capped `data/summaries.json` cache. No new dependencies.

## Root Cause Analysis

- `extractParagraphs()` keeps any `<p>` with `text.length >= 40` that does not
  match `BOILERPLATE` or a short prefix list. "Listen to this article in
  summarized format" (44 chars) matches none of these, so it is kept.
- When `GROQ_API_KEY` is unset, `extractiveBrief()` joins leading paragraphs and
  caps at 100 words. If the true body was not scraped, the widget line is the
  only/leading paragraph, so it becomes the brief.
- `condenseArticle()` caches the brief keyed by `article.id` and returns the
  cached value unconditionally on later loads, so the bad brief persists.
- There is a `MAX_WORDS = 100` cap but no minimum, so a one-line stub is
  accepted.

## Requirements Traceability

| Requirement | Addressed by |
|---|---|
| R1 (only article content) | `WIDGET_NOISE` patterns in `scrape.ts`; `containsNoise()` validation reused in `summarize.ts` |
| R2 (60–100 words) | `MIN_WORDS`/`MAX_WORDS`, `capAtWordLimit()` (max), source selection to reach the floor |
| R3 (fallback) | `chooseBriefSource()` selecting scraped vs RSS by usable word count |
| R4 (self-healing cache) | `isValidBrief()` gate on cache write and cache read |
| R5 (layout) | article page order + `line-clamp-2` summary |
| R6 (honest label) | brief header text |

## Component Design

### 1. `src/lib/scrape.ts` — widget/boilerplate filtering

Add a dedicated pattern for media/player/promo widgets, separate from the
existing `BOILERPLATE` (which targets ads/legal/promo tails). Keep both;
`extractParagraphs()` rejects a paragraph if either matches.

```ts
// Player/audio/summarizer widgets and cross-app promos that ride inside <p> tags
const WIDGET_NOISE =
  /\b(listen to (this )?article|summari[sz]ed format|play audio|audio (summary|version)|text[- ]to[- ]speech|listen to the (latest|full) (news|story)|read (this )?(article|story) in (the )?app|open in app|available on (the )?(app store|google play)|download the (app|economic times|et) app)\b/i;
```

Change in `extractParagraphs()` loop:

```ts
if (text.length < 40) continue;
if (/^(share|subscribe|...|advertisement)/i.test(text)) continue;
if (BOILERPLATE.test(text)) continue;
if (WIDGET_NOISE.test(text)) continue;   // NEW
paragraphs.push(text);
```

Export a small helper so the summarizer can reuse the exact same judgement
(single source of truth):

```ts
export function isNoiseText(text: string): boolean {
  return BOILERPLATE.test(text) || WIDGET_NOISE.test(text);
}
```

Rationale (R1.5): only paragraphs that match a *recognized* pattern are dropped;
anything unrecognized is retained to favor recall of real content.

### 2. `src/lib/summarize.ts` — length, source selection, validation, cache

**Constants**
```ts
const MIN_WORDS = 60;
const MAX_WORDS = 100;
```

**Source selection (R3).** Build a usable word pool from scraped paragraphs and,
independently, from the RSS summary; choose the source that yields more usable
words. Widget/boilerplate paragraphs are already excluded by scrape.ts, but we
defensively re-filter here using `isNoiseText()`.

```ts
function usableBody(paragraphs: string[]): string {
  return paragraphs.filter((p) => !isNoiseText(p)).join(" ").trim();
}

// Returns the text the brief should be built from, or "" if nothing usable.
function chooseBriefSource(paragraphs: string[], rssSummary: string): string {
  const scraped = usableBody(paragraphs);
  const rss = (rssSummary || "").trim();
  // Prefer whichever provides more usable content; RSS wins ties/when longer.
  return countWords(rss) > countWords(scraped) ? rss : scraped || rss;
}
```

Note: the RSS summary is short (≤ ~320 chars), so it is a floor-of-last-resort;
when scraped content is healthy it will have far more words and win.

**Extractive brief (R2).** `capAtWordLimit()` already trims to ≤ 100 words at a
sentence boundary. The 60-word floor is a target reachable only from available
content; when the chosen source has ≥ 60 usable words the brief will meet it.

**Validation (R1/R2/R4).**
```ts
function isValidBrief(text: string, opts: { moreContentAvailable: boolean }): boolean {
  if (!text) return false;
  if (isNoiseText(text)) return false;            // no widget/boilerplate leakage
  const w = countWords(text);
  if (w > MAX_WORDS) return false;
  if (w < MIN_WORDS && opts.moreContentAvailable) return false; // stub w/ content left
  return true;
}
```
`moreContentAvailable` = the chosen source had ≥ 60 usable words (i.e. a short
brief is a bug, not an inherent limit).

**Groq prompt (R2).** Update the instruction from "AT MOST 100 words" to
"between 60 and 100 words"; keep the "ignore ads/promos/related links" clause.

**Condense flow (R3/R4).**
```ts
export async function condenseArticle(article, scrapedParagraphs): Promise<Brief> {
  const source = chooseBriefSource(scrapedParagraphs, article.summary);
  const moreContentAvailable = countWords(source) >= MIN_WORDS;

  const cache = await readCache();
  const hit = cache[article.id];
  if (hit && isValidBrief(hit.brief, { moreContentAvailable })) {
    return toBrief(hit);                 // serve only VALID cache (self-heal read)
  }

  const fromGroq = await groqBrief(article, scrapedParagraphs); // uses source internally
  const brief = fromGroq ?? capAtWordLimit(source);
  const engine = fromGroq ? "groq" : "extractive";

  if (isValidBrief(brief, { moreContentAvailable })) {
    await writeCache({ ...cache, [article.id]: { brief, engine, at: new Date().toISOString() } });
  }
  // else: skip caching so it is retried next load (self-heal write)

  return { paragraphs: brief.split(/\n{2,}/).filter(Boolean), engine };
}
```
`groqBrief()` is adjusted to condense from the same `chooseBriefSource()` result
(falling back to `article.summary` when empty), so both engines see the cleaned
source. Atomic write and `MAX_CACHE_ENTRIES` cap are unchanged (R4.3).

### 3. `src/app/article/[id]/page.tsx` — layout & label

- Reading order already matches R5 (label → title → summary → meta → image →
  brief). Add `line-clamp-2` to the summary paragraph so it is at most two lines
  (R5.2).
- Change the brief header descriptor from `Condensed to 100 words` to
  `Condensed to 60–100 words` (R6.1).
- The brief body already renders only `brief.paragraphs`; once extraction and
  validation drop the widget text, no player element can appear (R5.4). No new
  markup is added.
- Keep the attribution note (R6.2) and the existing empty-state fallback (R3.4).

## Data Model

No schema change to `data/summaries.json`
(`Record<id, { brief, engine, at }>`). Correctness is enforced by validating the
`brief` field on read and write rather than by a version field, so pre-existing
poisoned entries (e.g. the Axis Bank brief) are detected as invalid and
regenerated on next view.

## Error Handling & Fallback Order

1. Groq brief (if key set and returns ≥ 20 words) → validated.
2. Extractive brief from `chooseBriefSource()` (scraped-preferred, RSS fallback).
3. RSS summary alone (when scraped body is empty/unusable).
4. Existing "content unavailable / View Source" message when the source pool is
   empty. Network/scrape/LLM failures continue to fail soft (return null / fall
   through), as today.

## Testing Strategy

- **Build/typecheck:** `npm run build` must pass.
- **Unit-style checks (Node/ts script or ad hoc):**
  - `isNoiseText("Listen to this article in summarized format")` → true.
  - `isNoiseText("Axis Bank has appointed Rajeev Mantri…")` → false.
  - `isValidBrief` rejects widget text, > 100 words, and < 60 words when content
    was available; accepts a clean 60–100 word brief.
  - `capAtWordLimit` never exceeds 100 words and cuts on sentence boundaries
    (regression: decimals like "10.5%" not split).
- **Manual:** delete/allow-regeneration of the Axis Bank article's cached entry,
  load the page, confirm the brief is the article (60–100 words) with no player
  label, summary is ≤ 2 lines, header reads "Condensed to 60–100 words".
- **Cache self-heal:** with a poisoned entry present, loading the page replaces
  it with a valid brief; a valid entry is served from cache without regeneration.

## Edge Cases

- Source page yields < 60 usable words total and RSS is also short → brief is the
  best available text (< 60 allowed as last resort, not cached as a failure only
  when more content existed).
- Very long body → truncated at sentence boundary ≤ 100 words.
- Groq returns > 100 words → `capAtWordLimit` trims before validation.
- Non-ASCII/entity-heavy text → unchanged `stripHtml` decoding applies before
  filtering.
## Addendum — Root Cause 2: ET/Times Internet body container

A follow-up defect showed ET briefs rendering a block of unrelated teaser
headlines ("ET Prime Special …", "The Eveready story …", "NSE, Jio mega IPOs …").
Live-HTML diagnosis of three ET pages plus one Mint page found:

- ET/TOI store the body in a single `<div ... class="…artText…">` using `<br><br>`
  paragraph breaks and **no `<p>` tags**. The current extractor collects only
  `<p>` blocks; after `<article>` isolation the only `<p>` tags left are the
  "ET Prime / Stories you might like" recommendation teasers — so those became the
  "body" (and a short article extracted zero paragraphs).
- The real body text is present in the fetched HTML (not a paywall/JS problem);
  Mint scrapes correctly because it uses real `<p>` tags.
- Already-cached teaser briefs are ~82 words with no noise match, so `isValidBrief`
  accepted them — they will not self-heal until the teaser marker is treated as noise.

### Fix

1. `src/lib/scrape.ts` — add a Times-Internet body path that runs BEFORE the generic
   `<p>` path:
   - Locate the body container: `/<div[^>]*class="[^"]*\bartText\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i`
     (non-greedy to the first `</div>`; capturing leading body paragraphs is
     sufficient for a <=100-word brief).
   - Split its inner HTML on runs of `<br>` (`/(?:<br\s*\/?>\s*)+/i`), then `stripHtml`,
     trim, and apply the same length / prefix / `BOILERPLATE` / `WIDGET_NOISE` filters
     used for `<p>` paragraphs.
   - If this yields >=1 paragraph, use it; otherwise fall through to the existing
     `<article>` + `<p>` extraction (Mint/BusinessLine/Hindu are unaffected).
2. `src/lib/scrape.ts` — extend the noise patterns (folded into `isNoiseText`) with the
   ET recommendation markers: `ET Prime`, `stories you might (like|be interested)`,
   `recommended for you`. This both filters any teaser paragraph that slips into the
   `<p>` path and makes `isValidBrief` reject already-cached teaser briefs so they
   regenerate on next view (self-heal, no manual cache edit needed).
3. No change needed to `summarize.ts` logic: `chooseBriefSource()` and `isValidBrief()`
   already prefer the cleaned body / RSS and reject invalid briefs; the new noise
   markers plug directly into the existing self-heal path.

### Verification (root cause 2)

- Re-run extraction against the three live ET URLs (Zepto IPO, Axis CFO appointment,
  HDFC Q1) and confirm the extracted text is the real article (contains "$4.5 billion",
  "Rajeev Mantri", "19,060" respectively) and contains none of the teaser headlines.
- Confirm Mint still extracts clean multi-paragraph prose (no regression).
- Confirm the resulting brief is 60-100 words (or the clean RSS summary when the body
  is short) with no "ET Prime" text, and that a previously poisoned cache entry is
  replaced on next load.
