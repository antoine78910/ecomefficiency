"use client";

import * as React from "react";

export type TocItem = {
  id: string;
  label: string;
};

function getActiveIdFromHash(items: TocItem[]) {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash || "";
  const id = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!id) return null;
  return items.some((i) => i.id === id) ? id : null;
}

export default function ToolToc({
  items,
  defaultActiveId,
}: {
  items: TocItem[];
  defaultActiveId?: string;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(() => {
    const fromHash = getActiveIdFromHash(items);
    return fromHash || defaultActiveId || items[0]?.id || null;
  });

  React.useEffect(() => {
    const fromHash = getActiveIdFromHash(items);
    if (fromHash) setActiveId(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!items.length) return;

    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    // Highlight the section that is currently crossing a “virtual” line near the top.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

        const next = visible[0]?.target?.id;
        if (next) setActiveId(next);
      },
      { root: null, threshold: [0.15, 0.3, 0.5, 0.75], rootMargin: "-20% 0px -70% 0px" },
    );

    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-white/10 bg-gray-900/30 p-4">
      <div className="text-sm font-semibold text-white">Sommaire</div>
      <ul className="mt-3 space-y-1">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                onClick={() => setActiveId(it.id)}
                className={[
                  "block rounded-lg px-2 py-1.5 text-sm transition-colors",
                  isActive ? "bg-purple-500/15 text-purple-200 border border-purple-500/25" : "text-gray-300 hover:text-white hover:bg-white/5",
                ].join(" ")}
              >
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

