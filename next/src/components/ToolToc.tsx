"use client";

import * as React from "react";

export type TocItem = {
  id: string;
  label: string;
  level?: 2 | 3;
};

type TocGroup = {
  h2: TocItem;
  h3s: TocItem[];
};

function getActiveIdFromHash(items: TocItem[]) {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash || "";
  const id = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!id) return null;
  return items.some((i) => i.id === id) ? id : null;
}

function groupToc(items: TocItem[]): TocGroup[] {
  const groups: TocGroup[] = [];
  let current: TocGroup | null = null;

  for (const it of items) {
    const level = it.level || 2;
    if (level === 2) {
      current = { h2: { ...it, level: 2 }, h3s: [] };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = { h2: { id: "overview", label: "Overview", level: 2 }, h3s: [] };
      groups.push(current);
    }
    current.h3s.push({ ...it, level: 3 });
  }

  return groups;
}

export default function ToolToc({
  items,
  defaultActiveId,
  collapseSubheadings = true,
}: {
  items: TocItem[];
  defaultActiveId?: string;
  collapseSubheadings?: boolean;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(() => {
    const fromHash = getActiveIdFromHash(items);
    return fromHash || defaultActiveId || items[0]?.id || null;
  });

  const groups = React.useMemo(() => groupToc(items), [items]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => ({}));

  React.useEffect(() => {
    const fromHash = getActiveIdFromHash(items);
    if (fromHash) setActiveId(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure the active section's H2 group is expanded (helps orientation).
  React.useEffect(() => {
    if (!collapseSubheadings || !activeId) return;
    for (const g of groups) {
      if (g.h2.id === activeId || g.h3s.some((h) => h.id === activeId)) {
        setExpanded((s) => ({ ...s, [g.h2.id]: true }));
        break;
      }
    }
  }, [activeId, collapseSubheadings, groups]);

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
    <nav aria-label="Table of contents" className="rounded-2xl border border-white/10 bg-gray-900/30 p-3">
      <div className="text-[11px] font-semibold text-white/90 uppercase tracking-wide">Table of contents</div>
      <ul className="mt-2 space-y-1">
        {groups.map((g) => {
          const h2Active = g.h2.id === activeId;
          const anyChildActive = g.h3s.some((h) => h.id === activeId);
          const isGroupExpanded = !collapseSubheadings || !!expanded[g.h2.id];
          const hasChildren = g.h3s.length > 0;

          return (
            <li key={g.h2.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <a
                  href={`#${g.h2.id}`}
                  onClick={() => setActiveId(g.h2.id)}
                  className={[
                    "flex-1 block rounded-lg px-2 py-1 text-xs transition-colors border",
                    h2Active || anyChildActive ? "bg-purple-500/15 text-purple-200 border-purple-500/25" : "border-transparent text-gray-300 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  {g.h2.label}
                </a>

                {collapseSubheadings && hasChildren ? (
                  <button
                    type="button"
                    aria-label={isGroupExpanded ? "Collapse section" : "Expand section"}
                    className="shrink-0 rounded-md px-2 py-1 text-[11px] text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                    onClick={() => setExpanded((s) => ({ ...s, [g.h2.id]: !s[g.h2.id] }))}
                  >
                    {isGroupExpanded ? "−" : "+"}
                  </button>
                ) : null}
              </div>

              {collapseSubheadings && hasChildren && !isGroupExpanded ? null : hasChildren ? (
                <ul className="space-y-1">
                  {g.h3s.map((h) => {
                    const isActive = h.id === activeId;
                    return (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          onClick={() => setActiveId(h.id)}
                          className={[
                            "block rounded-lg px-2 py-1 text-xs transition-colors pl-4",
                            isActive ? "bg-purple-500/10 text-purple-200 border border-purple-500/20" : "text-gray-400 hover:text-white hover:bg-white/5",
                          ].join(" ")}
                        >
                          {h.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

