import type { BriefItem } from "@/lib/types";

export default function Briefs({ briefs }: { briefs: BriefItem[] }) {
  if (briefs.length === 0) return null;

  const byIndustry = new Map<string, BriefItem[]>();
  for (const b of briefs) {
    const list = byIndustry.get(b.industry) ?? [];
    list.push(b);
    byIndustry.set(b.industry, list);
  }
  const columns = [...byIndustry.entries()].slice(0, 3);

  return (
    <section className="border-t border-primary/20 py-10">
      <div className="grid gap-10 lg:grid-cols-3">
        {columns.map(([industry, items]) => (
          <div key={industry}>
            <h3 className="label-caps border-b border-primary pb-2">
              {industry} Brief
            </h3>
            <ul className="mt-4 space-y-4">
              {items.map((b) => (
                <li key={b.link} className="font-serif text-[15px] leading-6">
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <strong className="font-semibold group-hover:text-secondary">
                      {b.bold}
                    </strong>{" "}
                    <span className="text-on-surface-variant">{b.rest}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
