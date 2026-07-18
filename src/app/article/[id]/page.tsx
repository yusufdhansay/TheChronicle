import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import Ticker from "@/components/Ticker";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import { getArticleById } from "@/lib/store";
import { TOPIC_LABELS } from "@/lib/types";
import { scrapeArticle } from "@/lib/scrape";
import { condenseArticle } from "@/lib/summarize";
import ScrollProgress from "@/components/ScrollProgress";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) notFound();

  const article = await getArticleById(id);
  if (!article) notFound();

  const scraped = await scrapeArticle(article.link);
  const brief = await condenseArticle(article, scraped?.paragraphs ?? []);
  const hasBody = brief.paragraphs.length > 0;

  const publishedDate = new Date(article.publishedAt).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    },
  );

  return (
    <>
      <ScrollProgress />
      <Ticker />
      <Masthead active={article.topic} />

      <main className="mx-auto max-w-[800px] px-5 py-16 md:px-0">
        <article className="article-fade-in flex flex-col">
          {/* ── Article Header ── */}
          <div className="mb-12">
            <Link
              href={`/section/${article.topic}`}
              className="label-caps mb-4 block text-secondary hover:underline"
            >
              {TOPIC_LABELS[article.topic]}
            </Link>

            <h1 className="font-display text-[32px] leading-[38px] font-bold md:text-[40px] md:leading-[48px]">
              {article.title}
            </h1>

            <p className="mt-6 font-serif text-xl leading-8 italic text-on-surface-variant line-clamp-2">
              {article.summary}
            </p>

            <div className="mt-8 flex items-center justify-between border-y border-primary/10 py-4">
              <div className="flex flex-col">
                <span className="font-sans text-sm font-bold">
                  {article.source}
                </span>
                <span className="font-serif text-sm text-on-surface-variant">
                  via RSS feed
                </span>
              </div>
              <div className="text-right">
                <span className="label-caps text-on-surface-variant">
                  {publishedDate}
                </span>
              </div>
            </div>
          </div>

          {/* ── Hero Image ── */}
          {article.image && (
            <figure className="mb-16">
              <div className="aspect-video w-full overflow-hidden bg-surface-container-high">
                <img
                  src={article.image}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {scraped?.imageCaption && (
                <figcaption className="mt-3 border-r-2 border-secondary pr-4 text-right font-serif text-sm italic text-on-surface-variant">
                  {scraped.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* ── The Brief: article condensed to at most 100 words ── */}
          <section className="mx-auto w-full max-w-[680px]">
            <div className="mb-8 flex items-center justify-between border-b border-primary pb-2">
              <p className="label-caps">The Brief</p>
              <p className="label-caps text-on-surface-variant">
                Condensed to 60–100 words
              </p>
            </div>
            <div className="space-y-8 font-serif text-xl leading-9">
              {hasBody ? (
                brief.paragraphs.map((p, i) =>
                  i === 0 ? (
                    <p key={i}>
                      <span className="article-drop-cap">{p.charAt(0)}</span>
                      {p.slice(1)}
                    </p>
                  ) : (
                    <p key={i}>{p}</p>
                  ),
                )
              ) : (
                /* Only reachable if both scraping and the RSS summary are empty */
                <p className="text-on-surface-variant">
                  We couldn&apos;t load this article&apos;s content from{" "}
                  {article.source}. Use &ldquo;View Source&rdquo; below for
                  the complete story.
                </p>
              )}
            </div>
            <p className="mt-10 border-l-2 border-secondary pl-4 font-serif text-sm italic text-on-surface-variant">
              This brief was condensed by The Chronicle from the original
              reporting by {article.source}. For the complete story, read it
              at the source.
            </p>
          </section>

          {/* ── Bottom Actions ── */}
          <footer className="mt-20 flex items-center justify-between border-t border-primary/10 pt-8">
            <Link
              href="/"
              className="label-caps flex items-center gap-2 text-on-surface-variant transition-colors hover:text-secondary"
            >
              <ArrowLeft size={14} /> Back to Front Page
            </Link>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps flex items-center gap-2 text-on-surface-variant underline underline-offset-4 transition-colors hover:text-primary"
            >
              View Source <ArrowUpRight size={14} />
            </a>
          </footer>
        </article>
      </main>

      <Footer />
    </>
  );
}
