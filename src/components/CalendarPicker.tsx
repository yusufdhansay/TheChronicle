"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

export default function CalendarPicker({
  dates,
  selected,
}: {
  dates: string[];
  selected?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const min = dates.length > 0 ? dates[dates.length - 1] : undefined;
  const max = dates.length > 0 ? dates[0] : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="label-caps flex items-center gap-2 border border-primary px-3 py-2 transition-colors hover:bg-primary hover:text-on-primary"
        title="Read a previous edition"
      >
        <Calendar size={13} />
        {selected ?? "Editions"}
      </button>
      {open && (
        <div className="absolute left-1/2 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 border border-primary bg-surface p-4 sm:left-auto sm:right-0 sm:translate-x-0">
          <p className="label-caps mb-3 text-on-surface-variant">
            Past Editions
          </p>
          <input
            type="date"
            min={min}
            max={max}
            defaultValue={selected}
            onChange={(e) => {
              if (e.target.value) {
                setOpen(false);
                router.push(`/edition/${e.target.value}`);
              }
            }}
            className="mb-3 w-full border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-sans text-sm"
          />
          {dates.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {dates.slice(0, 14).map((d) => (
                <li key={d}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push(`/edition/${d}`);
                    }}
                    className={`w-full px-1 py-1 text-left font-serif text-sm hover:bg-surface-container ${
                      d === selected ? "bg-surface-container font-semibold" : ""
                    }`}
                  >
                    {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-serif text-sm text-on-surface-variant">
              No archived editions yet. They accumulate as the paper refreshes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
