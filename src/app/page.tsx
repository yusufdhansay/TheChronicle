import Ticker from "@/components/Ticker";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EditionView from "@/components/EditionView";
import { getEdition } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function FrontPage() {
  const edition = await getEdition();

  return (
    <>
      <Ticker />
      <Masthead />
      <div className="mx-auto max-w-[1280px] px-5 pt-4 lg:px-16">
        <p className="label-caps text-on-surface-variant">
          Edition of{" "}
          {new Date(`${edition.date}T00:00:00`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · Updated{" "}
          {new Date(edition.fetchedAt).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST · Auto-refreshes every 12 hours
        </p>
      </div>
      <EditionView edition={edition} />
      <Footer />
    </>
  );
}
