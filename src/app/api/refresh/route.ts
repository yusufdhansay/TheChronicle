import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshEdition } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const edition = await refreshEdition();
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      fetchedAt: edition.fetchedAt,
      articles: edition.articles.length,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Refresh failed" },
      { status: 500 },
    );
  }
}
