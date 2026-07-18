import { notFound } from "next/navigation";
import Link from "next/link";
import Ticker from "@/components/Ticker";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import { ListStory } from "@/components/Story";
import { getEdition } from "@/lib/store";
import { getMarketQuotes } from "@/lib/markets";
import {
  TOPICS,
  TOPIC_LABELS,
  TOPIC_DESCRIPTIONS,
  type TopicSlug,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (!TOPICS.includes(topic as TopicSlug)) notFound();
  const slug = topic as TopicSlug;

  const [edition, quotes] = await Promise.all([
    getEdition(),
    getMarketQuotes(),
  ]);

  const stories = edition.articles
    .filter((a) => a.topic === slug)
    .sort((a, b) => b.score - a.score);

  const trending = edition.articles
    .filter((a) => a.topic !== slug)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <>
      <Ticker />
      <Masthead active={slug} />
      <main className="mx-auto max-w-[1280px] px-5 lg:px-16">
        <div className="border-b border-primary/20 py-10">
          <p className="label-caps flex items-center gap-2 text-secondary">
            <span className="inline-block h-2.5 w-2.5 bg-secondary" />
            Sector Focus
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            {TOPIC_LABELS[slug]}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-8 text-on-surface-variant">
            {TOPIC_DESCRIPTIONS[slug]}
          </p>
        </div>

        <div className="grid gap-12 py-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {stories.length > 0 ? (
              stories.map((a) => <ListStory key={a.id} article={a} />)
            ) : (
              <p className="py-12 font-serif text-lg text-on-surface-variant">
                No stories in this section right now. Try Refresh Now, or
                check back after the next 12-hour edition.
              </p>
            )}
          </div>

          <aside className="lg:col-span-4 lg:border-l lg:border-primary/20 lg:pl-10">
            <section>
              <h2 className="label-caps border-b border-primary pb-2">
                Market Pulse
              </h2>
              <ul>
                {quotes.slice(0, 5).map((q) => (
                  <li
                    key={q.symbol}
                    className="flex items-center justify-between border-b border-primary/10 py-3"
                  >
                    <span className="label-caps">{q.label}</span>
                    <span className="text-right">
                      <span className="block font-sans text-sm font-medium">
                        {fmt(q.price)}
                      </span>
                      <span
                        className={`block font-sans text-xs font-semibold ${
                          q.change >= 0 ? "text-gain" : "text-loss"
                        }`}
                      >
                        {q.change >= 0 ? "+" : ""}
                        {fmt(q.changePercent)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="label-caps border-b border-primary pb-2">
                Trending Elsewhere
              </h2>
              <ol className="mt-2">
                {trending.map((a, i) => (
                  <li
                    key={a.id}
                    className="flex gap-4 border-b border-primary/10 py-4 last:border-b-0"
                  >
                    <span className="font-display text-4xl font-bold text-outline-variant">
                      {i + 1}
                    </span>
                    <Link
                      href={`/article/${a.id}`}
                      className="font-serif text-[15px] leading-6 hover:text-secondary"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-10 bg-primary p-6 text-on-primary">
              <h2 className="label-caps">The Quiet Ledger</h2>
              <p className="mt-3 font-serif text-sm leading-6 opacity-80">
                Editions are assembled every 12 hours from India&apos;s most
                trusted financial newsrooms. Use the calendar in the masthead
                to read any previous day&apos;s paper.
              </p>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
