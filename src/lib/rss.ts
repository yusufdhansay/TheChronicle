/** Minimal, dependency-free RSS 2.0 parser sufficient for the feeds we use. */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extract(block: string, tag: string): string {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"),
  );
  if (cdata) return cdata[1].trim();
  const plain = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return plain ? plain[1].trim() : "";
}

function extractImage(block: string): string | undefined {
  // <enclosure url="..." type="image/..."> (ET, TOI) or
  // <media:content url="..." medium="image"> (Mint, Hindu group)
  const enclosure = block.match(
    /<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"|<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"|<enclosure[^>]*url="([^"]+)"/i,
  );
  const media = block.match(/<media:content[^>]*url="([^"]+)"/i);
  const url = media?.[1] ?? enclosure?.[1] ?? enclosure?.[2] ?? enclosure?.[3];
  if (url && /^https?:\/\//.test(url)) return decodeEntities(url);
  return undefined;
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const matches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of matches) {
    const title = stripTags(decodeEntities(extract(block, "title")));
    const link = decodeEntities(extract(block, "link")).trim();
    const description = stripTags(decodeEntities(extract(block, "description")));
    const pubDate = extract(block, "pubDate") || extract(block, "dc:date");
    if (title && link.startsWith("http")) {
      items.push({ title, link, description, pubDate, image: extractImage(block) });
    }
  }
  return items;
}
