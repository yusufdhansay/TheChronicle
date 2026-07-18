/**
 * Article content scraper.
 *
 * Fetches the full HTML of a publisher page and extracts readable
 * paragraph text. This keeps users on The Chronicle while still
 * showing full article content.
 *
 * Falls back gracefully: when scraping fails the article page
 * renders the RSS summary and prompts "View Source".
 */

const SCRAPE_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; TheChronicle/1.0; +https://thechronicle.in)";

export interface ScrapedContent {
  paragraphs: string[];
  imageCaption?: string;
}

/**
 * Strip HTML tags, decode entities, normalise whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/&\w+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Leading labels that indicate navigation/promo rather than article prose. */
const NON_CONTENT_PREFIX =
  /^(share|subscribe|sign up|log in|copyright|follow us|also read|read also|related|recommended|trending|popular|advertisement)/i;

/**
 * Clean one raw HTML fragment into article text, or return null if it is too
 * short or matches a non-content / boilerplate / widget / promo pattern.
 */
function cleanParagraph(rawHtml: string): string | null {
  const text = stripHtml(rawHtml)
    .replace(/\s*\|?\s*(photo|image|file (photo|image)) credit:.*$/i, "")
    .replace(/\s*\|\s*representational (photo|image).*$/i, "")
    .trim();
  if (text.length < 40) return null;
  if (NON_CONTENT_PREFIX.test(text)) return null;
  if (isNoiseText(text)) return null;
  return text;
}

/**
 * Extract the main article body from raw HTML.
 *
 * Strategy:
 *  1. Times Internet sites (Economic Times, Times of India) put the body in a
 *     `<div class="artText">` using `<br><br>` breaks and no `<p>` tags — read
 *     that container first, splitting on `<br>` runs.
 *  2. Otherwise isolate `<article>` and collect `<p>` blocks (Mint, BusinessLine,
 *     The Hindu, etc.).
 */
function extractParagraphs(html: string): string[] {
  // Remove scripts, styles, noscript, nav, aside, form, figures, comments
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // 1) Times Internet body container (<div class="…artText…"> with <br> breaks)
  const artText = cleaned.match(
    /<div[^>]*class="[^"]*\bartText\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (artText) {
    const fromArt = artText[1]
      .split(/(?:<br\s*\/?>\s*)+/i)
      .map(cleanParagraph)
      .filter((t): t is string => t !== null);
    if (fromArt.length > 0) return fromArt;
  }

  // 2) Generic: isolate <article> then collect <p> blocks
  let scope = cleaned;
  const articleMatch = scope.match(/<article[\s>][\s\S]*?<\/article>/i);
  if (articleMatch) scope = articleMatch[0];

  const pMatches = [...scope.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)];
  const paragraphs: string[] = [];
  for (const m of pMatches) {
    const text = cleanParagraph(m[0]);
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

/**
 * Promo/ad/boilerplate fragments that appear inside otherwise valid <p>
 * blocks on Indian news sites (word-boundary safe: `\bsubscribe\b` does
 * not match "subscribed" in IPO coverage).
 */
const BOILERPLATE =
  /\b(also read|read more:|click here|download (the )?([\w ]{0,20})?app|\bsubscribe\b|newsletter|whatsapp channel|telegram channel|follow us|all rights reserved|disclaimer:?|views expressed|catch all the|log ?in to|sign ?in to|premium stor(y|ies)|recommended stories|top trending|stock radar|advertisement|sponsored|affiliate|unlock (a world|premium)|limited(-| )time offer|special offer|epaper|e-paper|live blog|liveblog|breaking news alerts|push notifications|please enable javascript|your browser|cookies? polic\w+|terms of (use|service)|privacy policy)\b/i;

/**
 * Player/audio/summarizer widgets and cross-app promos that ride inside
 * otherwise valid <p> blocks (e.g. the "Listen to this article in
 * summarized format" audio-player label). These are publisher chrome, not
 * article content, so they must never enter the brief.
 */
const WIDGET_NOISE =
  /\b(listen to (this )?article|summari[sz]ed format|play audio|audio (summary|version)|text[- ]to[- ]speech|read (this )?(article|story) in (the )?app|open in app|available on (the )?(app store|google play)|download the ([\w ]{0,20})?app)\b/i;

/**
 * Recommendation/teaser blocks (ET Prime carousel etc.) that are not article
 * content. Matched anywhere in the text.
 */
const PROMO_NOISE =
  /\b(et prime|stories you might (like|be interested)|recommended for you|more from (the )?section|trending stories|popular (in|categories))\b/i;

/**
 * True when the text matches a recognized publisher boilerplate/promo or a
 * media/player/cross-app widget pattern. Exported as the single source of
 * truth so other modules (the summarizer) apply the exact same judgement.
 */
export function isNoiseText(text: string): boolean {
  return BOILERPLATE.test(text) || WIDGET_NOISE.test(text) || PROMO_NOISE.test(text);
}

/**
 * Extract image caption from the page (figcaption near the hero image).
 */
function extractCaption(html: string): string | undefined {
  const match = html.match(/<figcaption[\s>][\s\S]*?<\/figcaption>/i);
  if (match) {
    const text = stripHtml(match[0]).trim();
    if (text.length > 5 && text.length < 300) return text;
  }
  return undefined;
}

/**
 * Scrape an article URL and return structured content.
 * Returns null on any failure — the caller should handle fallback.
 */
export async function scrapeArticle(
  url: string,
): Promise<ScrapedContent | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const html = await res.text();
    const paragraphs = extractParagraphs(html);
    if (paragraphs.length === 0) return null;

    return {
      paragraphs,
      imageCaption: extractCaption(html),
    };
  } catch {
    return null;
  }
}
