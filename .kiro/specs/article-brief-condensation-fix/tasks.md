# Implementation Plan

- [x] 1. Filter player/audio/promo widgets in the scraper
  - In `src/lib/scrape.ts`, add a `WIDGET_NOISE` regex covering "listen to (this) article", "summarized/summarised format", "play audio", "audio summary/version", "text-to-speech", "read this article/story in the app", "open in app", "available on the app store/google play", and "download the … app".
  - In `extractParagraphs()`, reject any paragraph where `WIDGET_NOISE.test(text)` is true (in addition to the existing length, prefix, and `BOILERPLATE` checks).
  - Export a shared helper `isNoiseText(text: string): boolean` that returns `BOILERPLATE.test(text) || WIDGET_NOISE.test(text)`, and use it as the single source of truth for the paragraph rejection.
  - Keep unrecognized text (no matching pattern) so legitimate article paragraphs are retained.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Enforce 60–100 word briefs, source selection, validation, and self-healing cache in the summarizer
  - In `src/lib/summarize.ts`, add `const MIN_WORDS = 60;` alongside the existing `MAX_WORDS = 100`.
  - Import `isNoiseText` from `./scrape`; add `usableBody(paragraphs)` (join non-noise paragraphs) and `chooseBriefSource(paragraphs, rssSummary)` that returns whichever of the cleaned scraped body / RSS summary has more usable words (RSS preferred when it yields more).
  - Add `isValidBrief(text, { moreContentAvailable })`: false when empty, when `isNoiseText(text)`, when word count > `MAX_WORDS`, or when word count < `MIN_WORDS` while `moreContentAvailable` is true.
  - Update `groqBrief()` to condense from the `chooseBriefSource()` result (fallback to `article.summary` when empty); update the Groq system prompt to request a brief "between 60 and 100 words".
  - Update `extractiveBrief()`/`condenseArticle()` to build from `chooseBriefSource()`; compute `moreContentAvailable = countWords(source) >= MIN_WORDS`.
  - Serve a cached brief only when `isValidBrief(hit.brief, { moreContentAvailable })` is true; otherwise regenerate (self-heal on read).
  - Persist a newly produced brief only when `isValidBrief(...)` is true; otherwise skip caching (self-heal on write). Preserve the existing atomic write, `MAX_CACHE_ENTRIES` cap, and recorded engine field.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Update the article page layout and brief label
  - In `src/app/article/[id]/page.tsx`, add `line-clamp-2` to the summary paragraph beneath the title so it is at most two lines while always showing a summary.
  - Change the brief header descriptor text from "Condensed to 100 words" to "Condensed to 60–100 words".
  - Keep the existing attribution note and the existing empty-state "content unavailable / View Source" fallback; do not add any player/audio markup.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

- [x] 4. Verify build and behavior
  - Run `npm run build` and fix any type errors introduced by the changes.
  - Add ad-hoc checks (temporary Node/TS script, removed after): `isNoiseText("Listen to this article in summarized format")` is true; a normal article sentence is false; `isValidBrief` rejects widget text, >100-word, and <60-word-with-content-available cases and accepts a clean 60–100 word brief; `capAtWordLimit` never exceeds 100 words and does not split decimals like "10.5%".
  - Manually confirm the previously poisoned article renders a 60–100 word article brief with no player label, a ≤2-line summary, and the "Condensed to 60–100 words" header; confirm a valid cache entry is served without regeneration.
  - Clean up any temporary files created for verification.
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 4.2, 5.2, 5.4, 6.1_
- [x] 5. Fix ET/Times Internet body extraction and teaser noise in the scraper
  - In `src/lib/scrape.ts`, add a Times-Internet body path that runs before the generic `<p>` path: locate `<div class="…artText…">` via `/<div[^>]*class="[^"]*\bartText\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i`, split its inner HTML on `/(?:<br\s*\/?>\s*)+/i`, then `stripHtml`/trim each chunk and apply the existing length (>=40), prefix, `BOILERPLATE`, and `WIDGET_NOISE` filters. Use these paragraphs when at least one survives; otherwise fall through to the current `<article>`+`<p>` extraction.
  - Extend the noise coverage used by `isNoiseText` with ET recommendation markers: `ET Prime`, `stories you might (like|be interested)`, `recommended for you` (add to `WIDGET_NOISE` or a sibling pattern that `isNoiseText` also checks).
  - Do not regress the `<p>` path for Mint/BusinessLine/Hindu.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Verify ET extraction end-to-end and confirm cache self-heal
  - Run `npm run build` (0 errors).
  - Using a temporary Node script (deleted afterward), fetch the three live ET URLs (Zepto IPO articleshow/132451614, Axis CFO articleshow/132478660, HDFC Q1 articleshow/132477012) and the Mint AMFI URL, run the new extraction, and confirm: ET bodies now contain the real phrases ("4.5 billion", "Rajeev Mantri", "19,060"), contain none of the teaser headlines / "ET Prime", and Mint still returns clean multi-paragraph prose.
  - Confirm `isNoiseText("ET Prime Special – KYB and KYC…")` is true so poisoned cache entries fail `isValidBrief` and regenerate; optionally count entries in `data/summaries.json` that now fail validation.
  - Clean up temporary files.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
