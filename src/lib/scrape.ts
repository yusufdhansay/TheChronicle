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

/**
 * Extract the main article body from raw HTML.
 *
 * Strategy: look for `<article>` or well-known content containers
 * first, then fall back to the largest block of `<p>` tags.
 */
function extractParagraphs(html: string): string[] {
  // Remove scripts, styles, noscript, nav, header, footer, aside, form
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to isolate <article> content first
  const articleMatch = cleaned.match(
    /<article[\s>][\s\S]*?<\/article>/i,
  );
  if (articleMatch) {
    cleaned = articleMatch[0];
  }

  // Extract all <p> blocks
  const pMatches = [...cleaned.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)];
  const paragraphs: string[] = [];

  for (const m of pMatches) {
    // Strip photo/image credit fragments that ride along inside body <p>s
    const text = stripHtml(m[0])
      .replace(/\s*\|?\s*(photo|image|file (photo|image)) credit:.*$/i, "")
      .replace(/\s*\|\s*representational (photo|image).*$/i, "")
      .trim();
    // Filter out very short strings (navigation, labels, etc.)
    if (text.length < 40) continue;
    // Filter out obvious non-content
    if (/^(share|subscribe|sign up|log in|copyright|follow us|also read|read also|related|recommended|trending|popular|advertisement)/i.test(text))
      continue;
    // Publisher boilerplate, promos and ad copy anywhere in the paragraph
    if (BOILERPLATE.test(text)) continue;
    paragraphs.push(text);
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
