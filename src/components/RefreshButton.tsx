"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={refresh}
      disabled={busy}
      className="label-caps flex items-center gap-2 border border-primary px-3 py-2 transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-50"
      title="Fetch the latest stories now"
    >
      <RotateCw size={13} className={busy ? "animate-spin" : ""} />
      {busy ? "Refreshing" : "Refresh Now"}
    </button>
  );
}
