# Requirements Document

## Introduction

On the article detail page (`/article/[id]`), readers expect to see the news
story condensed to a short brief. In some cases the brief instead shows
publisher chrome scraped from the source page — for example the audio-player
label "Listen to this article in summarized format" — rather than the article
itself. This happens because the scraper's paragraph filters do not remove such
widget/boilerplate text, the summarizer enforces only a maximum (100 words) with
no minimum, and the resulting bad brief is cached and therefore persists across
visits.

This spec defines the corrected behavior: the article page must show the title,
a one-to-two line summary, and then the article condensed to **at least 60 and at
most 100 words** — and nothing else (no player labels, promos, or other
non-article text). It also covers self-healing of already-cached bad briefs.

Scope is limited to `src/lib/scrape.ts`, `src/lib/summarize.ts`, the article page
at `src/app/article/[id]/page.tsx`, and the summary cache in
`data/summaries.json`. RSS ingestion, classification, and the markets engine are
out of scope.

## Requirements

### Requirement 1 — The brief contains only article content

**User Story:** As a reader, I want the brief to contain only the news article, so that I never see player labels, promos, or other publisher widgets.

#### Acceptance Criteria
1. WHEN the scraper extracts paragraphs from a source page, THE SYSTEM SHALL discard any paragraph that is a media/player or "listen/summarized" widget label (including but not limited to text containing "listen to this article", "summarized format", "play audio", "text-to-speech", "audio summary").
2. WHEN the scraper extracts paragraphs, THE SYSTEM SHALL discard app-promo and cross-promo chrome (including but not limited to "read in app", "open in app", "also on", "download the app", "available on").
3. WHERE a paragraph matches a recognized boilerplate/widget pattern anywhere in its text, THE SYSTEM SHALL exclude the entire paragraph from the article body.
4. THE SYSTEM SHALL NOT include any scraped text that matches a recognized widget/boilerplate pattern in the rendered brief.
5. WHERE a paragraph contains only unrecognized text that does not match any known widget/boilerplate pattern, THE SYSTEM SHALL retain that paragraph, favoring recall of legitimate article content over aggressive filtering.

### Requirement 2 — Brief length is between 60 and 100 words

**User Story:** As a reader, I want the brief to be a substantial but concise summary, so that it is neither a stub nor an over-long block.

#### Acceptance Criteria
1. WHEN sufficient article content is available, THE SYSTEM SHALL produce a brief of at least 60 words and at most 100 words.
2. WHEN condensed text exceeds 100 words, THE SYSTEM SHALL truncate at a sentence boundary so the result does not exceed 100 words.
3. IF the produced brief is shorter than 60 words, THEN THE SYSTEM SHALL attempt to reach the 60-word floor from available article content before falling back.
4. THE SYSTEM SHALL count words consistently (whitespace-delimited, non-empty tokens) AND, using that consistent count, enforce both the 60-word minimum and the 100-word maximum on the final brief.

### Requirement 3 — Graceful fallback when content is insufficient

**User Story:** As a reader, I want a meaningful brief even when the source page cannot be fully scraped, so that the page is never dominated by junk or left empty.

#### Acceptance Criteria
1. IF scraping yields no usable article paragraphs, THEN THE SYSTEM SHALL fall back to the article's RSS summary as the brief source.
2. IF the system has begun with scraped content but then determines the scraped paragraphs are unusable (empty after filtering, or below the 60-word minimum), THEN THE SYSTEM SHALL switch to the RSS summary rather than committing to the scraped content.
3. WHEN both scraped content and the RSS summary are available, THE SYSTEM SHALL prefer whichever provides more usable content, selecting the RSS summary whenever it yields more usable content than the scraped body.
4. IF neither scraped content nor RSS summary can produce any usable text, THEN THE SYSTEM SHALL render the existing "content unavailable / View Source" fallback message.
5. WHEN a fallback is used, THE SYSTEM SHALL still exclude widget/boilerplate text per Requirement 1.

### Requirement 4 — Bad briefs must not persist (self-healing cache)

**User Story:** As a reader, I want a corrected brief to appear as soon as the fix ships, so that a previously cached bad brief does not keep showing.

#### Acceptance Criteria
1. WHEN a produced brief fails validation because it both contains recognized widget/boilerplate text AND/OR is below the 60-word minimum while more content was available, THE SYSTEM SHALL NOT persist that brief to the cache. (Briefs of 60+ words that pass validation MAY be persisted.)
2. WHEN the article page loads and the cached brief for that article fails current validation, THE SYSTEM SHALL regenerate the brief instead of serving the cached value.
3. THE SYSTEM SHALL preserve the existing atomic write and entry-cap behavior of the cache when regenerating.
4. THE SYSTEM SHALL record the engine used ("groq" or "extractive") for any brief it does persist.

### Requirement 5 — Article page layout

**User Story:** As a reader, I want a clean reading order, so that I see the title, a short summary, then only the article.

#### Acceptance Criteria
1. THE SYSTEM SHALL render, in order: the section label, the article title, a one-to-two line summary, source/date metadata, an optional hero image, and then the brief.
2. THE SYSTEM SHALL always render a summary directly beneath the title, consisting of at least one and at most two lines of text.
3. WHEN the brief is rendered, THE SYSTEM SHALL display only the condensed article text (60–100 words) in the brief body.
4. THE SYSTEM SHALL NOT display any player/"listen to this article" element within the brief section.

### Requirement 6 — Accurate brief labelling

**User Story:** As a reader, I want the on-page label to reflect the actual brief length, so that the UI is truthful.

#### Acceptance Criteria
1. WHERE the brief section shows a length descriptor, THE SYSTEM SHALL describe the brief as being within 60–100 words (e.g., "Condensed to 60–100 words") rather than implying a fixed 100-word length.
2. THE SYSTEM SHALL keep the existing attribution note that credits the original publisher.

### Requirement 7 — Correct body extraction for Times Internet sites (ET / TOI)

**User Story:** As a reader, I want Economic Times and Times of India articles to show the actual story, so that I never see the "ET Prime / Stories you might like" recommendation teasers instead of the article.

#### Acceptance Criteria
1. WHERE a source page stores its article body in a `div` whose class includes `artText` (Times Internet layout used by Economic Times and Times of India), THE SYSTEM SHALL extract the article text from that container, splitting paragraphs on `<br>` breaks rather than relying on `<p>` tags.
2. WHEN the `artText` container is used, THE SYSTEM SHALL NOT include the publisher's recommendation/teaser blocks (e.g. "ET Prime …", "Stories you might like", "Recommended for you") in the extracted body.
3. THE SYSTEM SHALL treat "ET Prime", "Stories you might like", and "Recommended for you" as recognized noise so that any such text is excluded from a brief and any previously cached brief containing it is regenerated (self-heals per Requirement 4).
4. WHERE a source page uses standard `<p>` tags for its body (e.g. Mint, BusinessLine, The Hindu), THE SYSTEM SHALL continue to extract via the existing `<p>`-based path with no regression.
5. IF neither the `artText` container nor the `<p>` path yields at least the minimum usable content, THEN THE SYSTEM SHALL fall back to the RSS summary per Requirement 3.

## Non-Goals
- Changing RSS ingestion, classification, de-duplication, or the markets engine.
- Adding an audio/text-to-speech feature (the "listen" widget is source chrome to be removed, not a feature to add).
- Introducing a new summarization provider beyond the existing Groq/extractive paths.
