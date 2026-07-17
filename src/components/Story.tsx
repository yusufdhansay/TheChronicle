import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Article } from "@/lib/types";
import { TOPIC_LABELS } from "@/lib/types";

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function LeadStory({ article }: { article: Article }) {
  return (
    <article className="grid items-center gap-8 py-10 lg:grid-cols-12">
      {article.image && (
        <div className="relative lg:col-span-6">
          <img
            src={article.image}
            alt=""
            className="aspect-[16/10] w-full border border-primary/20 object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="label-caps absolute bottom-3 left-3 bg-primary px-2 py-1 text-on-primary">
            {article.source}
          </span>
        </div>
      )}
      <div className={article.image ? "lg:col-span-6" : "lg:col-span-12"}>
        <p className="label-caps mb-4 text-secondary">
          {TOPIC_LABELS[article.topic]}
        </p>
        <h1 className="font-display text-4xl leading-tight font-bold lg:text-5xl lg:leading-[1.12]">
          {article.title}
        </h1>
        <p className="mt-6 border-l-2 border-secondary pl-5 font-serif text-lg leading-8 italic text-on-surface-variant">
          {article.summary}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-sm text-on-surface-variant">
            {article.source} · {timeAgo(article.publishedAt)}
          </p>
          <Link
            href={`/article/${article.id}`}
            className="label-caps flex items-center gap-1.5 text-secondary hover:underline"
          >
            Read the full story <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StoryCard({ article }: { article: Article }) {
  return (
    <article className="flex h-full flex-col">
      {article.image && (
        <img
          src={article.image}
          alt=""
          className="mb-4 aspect-[16/10] w-full border border-primary/20 object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <p className="label-caps mb-3 text-secondary">
        {TOPIC_LABELS[article.topic]}
      </p>
      <h2 className="font-display text-[22px] leading-snug font-semibold">
        {article.title}
      </h2>
      <p className="mt-3 line-clamp-3 font-serif text-[15px] leading-6 text-on-surface-variant">
        {article.summary}
      </p>
      <div className="mt-auto pt-4">
        <p className="font-serif text-sm text-on-surface-variant">
          {article.source} · {timeAgo(article.publishedAt)}
        </p>
        <Link
          href={`/article/${article.id}`}
          className="label-caps mt-2 inline-flex items-center gap-1.5 text-primary underline decoration-primary/40 underline-offset-4 hover:text-secondary"
        >
          Read the full story <ArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}

export function ListStory({ article }: { article: Article }) {
  return (
    <article className="border-b border-primary/20 py-8 last:border-b-0">
      <div className="flex flex-col gap-5 sm:flex-row">
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="h-40 w-full shrink-0 border border-primary/20 object-cover sm:h-32 sm:w-48"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="label-caps text-secondary">
              {TOPIC_LABELS[article.topic]}
            </span>
            <span className="h-1 w-1 bg-outline-variant" />
            <span className="label-caps font-medium tracking-normal normal-case text-on-surface-variant">
              {timeAgo(article.publishedAt)}
            </span>
          </div>
          <h2 className="font-display text-[24px] leading-snug font-bold">
            {article.title}
          </h2>
          <p className="mt-3 font-serif text-[16px] leading-7 text-on-surface-variant">
            {article.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-serif text-sm text-on-surface-variant">
              Via{" "}
              <span className="underline underline-offset-2">
                {article.source}
              </span>
            </p>
            <Link
              href={`/article/${article.id}`}
              className="label-caps flex items-center gap-1.5 text-secondary hover:underline"
            >
              Read the full story <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TopicRule({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-primary pb-2">
      <h2 className="label-caps flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 bg-secondary" />
        {label}
      </h2>
      <Link
        href={`/section/${slug}`}
        className="label-caps text-on-surface-variant hover:text-secondary"
      >
        All stories
      </Link>
    </div>
  );
}
