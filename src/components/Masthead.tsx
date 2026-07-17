import Link from "next/link";
import { TOPICS, TOPIC_LABELS } from "@/lib/types";
import type { TopicSlug } from "@/lib/types";
import RefreshButton from "./RefreshButton";
import CalendarPicker from "./CalendarPicker";
import { listArchiveDates } from "@/lib/store";

export default async function Masthead({
  active,
  editionDate,
}: {
  active?: TopicSlug;
  editionDate?: string;
}) {
  const dates = await listArchiveDates();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <header className="border-b border-primary/20">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-16">
        <div className="grid grid-cols-2 items-center gap-y-4 py-6 lg:grid-cols-[1fr_auto_1fr]">
          <p className="label-caps order-2 col-span-2 text-on-surface-variant lg:order-1 lg:col-span-1">
            {today}
          </p>
          <Link
            href="/"
            className="order-1 col-span-2 text-center font-display text-4xl font-black tracking-tight whitespace-nowrap lg:order-2 lg:col-span-1 lg:px-6 lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            THE CHRONICLE
          </Link>
          <div className="order-3 col-span-2 flex items-center justify-center gap-3 lg:col-span-1 lg:justify-end">
            <CalendarPicker dates={dates} selected={editionDate} />
            <RefreshButton />
          </div>
        </div>
        <p
          className="label-caps -mt-3 pb-4 text-center text-on-surface-variant lg:-mt-4"
        >
          A Daily Paper of Finance, Markets &amp; Policy
        </p>
      </div>
      <nav className="border-t border-primary/20">
        <div className="mx-auto flex max-w-[1280px] items-center gap-x-6 overflow-x-auto px-5 py-3 whitespace-nowrap lg:justify-center lg:px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOPICS.map((t) => (
            <Link
              key={t}
              href={`/section/${t}`}
              className={`label-caps pb-0.5 transition-colors hover:text-secondary ${
                active === t
                  ? "border-b-2 border-secondary text-secondary"
                  : "text-on-surface"
              }`}
            >
              {TOPIC_LABELS[t]}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
