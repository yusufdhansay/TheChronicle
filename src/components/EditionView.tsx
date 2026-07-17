import type { Article, Edition, TopicSlug } from "@/lib/types";
import { TOPICS, TOPIC_LABELS } from "@/lib/types";
import { LeadStory, StoryCard, ListStory, TopicRule } from "./Story";
import Briefs from "./Briefs";

/**
 * Renders a full edition front page: lead story, secondary grid,
 * per-topic sections and the cross-industry briefs strip.
 */
export default function EditionView({ edition }: { edition: Edition }) {
  const sorted = [...edition.articles].sort((a, b) => b.score - a.score);
  const [lead, ...rest] = sorted;
  const secondary = rest.slice(0, 4);
  const usedIds = new Set([lead?.id, ...secondary.map((a) => a.id)]);

  const byTopic = new Map<TopicSlug, Article[]>();
  for (const t of TOPICS) byTopic.set(t, []);
  for (const a of edition.articles) {
    if (usedIds.has(a.id)) continue;
    byTopic.get(a.topic)!.push(a);
  }

  return (
    <main className="mx-auto max-w-[1280px] px-5 lg:px-16">
      {lead ? (
        <>
          <LeadStory article={lead} />

          {secondary.length > 0 && (
            <section className="grid gap-8 border-t border-primary/20 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-primary/20">
              {secondary.map((a, idx) => (
                <div
                  key={a.id}
                  className={`
                    ${idx === 0 ? "lg:pl-0 lg:pr-8" : ""}
                    ${idx === 1 ? "lg:px-8" : ""}
                    ${idx === 2 ? "lg:px-8" : ""}
                    ${idx === 3 ? "lg:pl-8 lg:pr-0" : ""}
                  `}
                >
                  <StoryCard article={a} />
                </div>
              ))}
            </section>
          )}

          {TOPICS.map((t) => {
            const list = (byTopic.get(t) ?? [])
              .sort((a, b) => b.score - a.score)
              .slice(0, 4);
            if (list.length === 0) return null;
            return (
              <section key={t} className="py-8">
                <TopicRule slug={t} label={TOPIC_LABELS[t]} />
                <div className="mt-6 grid gap-x-10 lg:grid-cols-2">
                  {list.map((a) => (
                    <ListStory key={a.id} article={a} />
                  ))}
                </div>
              </section>
            );
          })}

          <Briefs briefs={edition.briefs} />
        </>
      ) : (
        <div className="py-24 text-center">
          <p className="font-display text-3xl font-bold">
            The presses are warming up.
          </p>
          <p className="mt-3 font-serif text-lg text-on-surface-variant">
            No stories could be fetched right now. Use Refresh Now to try
            again.
          </p>
        </div>
      )}
    </main>
  );
}
