import { notFound } from "next/navigation";
import Link from "next/link";
import Ticker from "@/components/Ticker";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EditionView from "@/components/EditionView";
import { getArchivedEdition } from "@/lib/store";
import { istDate } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function EditionPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const edition = await getArchivedEdition(date);
  const isToday = date === istDate();

  return (
    <>
      <Ticker />
      <Masthead editionDate={date} />
      <div className="mx-auto max-w-[1280px] px-5 pt-4 lg:px-16">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="label-caps text-on-surface-variant">
            {isToday ? "Today's Edition" : "Archived Edition"} ·{" "}
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {!isToday && (
            <Link
              href="/"
              className="label-caps text-secondary hover:underline"
            >
              Back to today
            </Link>
          )}
        </div>
      </div>
      {edition ? (
        <EditionView edition={edition} />
      ) : (
        <main className="mx-auto max-w-[1280px] px-5 lg:px-16">
          <div className="py-24 text-center">
            <p className="font-display text-3xl font-bold">
              No edition on record for this date.
            </p>
            <p className="mt-3 font-serif text-lg text-on-surface-variant">
              The archive begins the day The Chronicle first went to press on
              this machine. Pick another date from the calendar.
            </p>
          </div>
        </main>
      )}
      <Footer />
    </>
  );
}
