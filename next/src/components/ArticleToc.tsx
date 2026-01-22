"use client";

import * as React from "react";

export type TocItem = { id: string; label: string };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ArticleToc({
  items,
  className,
  linkClassName,
  activeLinkClassName,
  heading,
}: {
  items: TocItem[];
  heading?: string;
  className?: string;
  linkClassName?: string;
  activeLinkClassName?: string;
}) {
  const [activeId, setActiveId] = React.useState<string>(items[0]?.id ?? "");

  React.useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    if (fromHash && items.some((i) => i.id === fromHash)) setActiveId(fromHash);
  }, [items]);

  React.useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const top = visible[0]?.target as HTMLElement | undefined;
        if (top?.id) setActiveId(top.id);
      },
      {
        // Highlight section when it reaches roughly the upper third.
        root: null,
        rootMargin: "-30% 0px -60% 0px",
        threshold: [0.01, 0.1, 0.2],
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className={className}>
      {heading ? <p className="text-xs tracking-widest text-gray-400 mb-3">{heading}</p> : null}
      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveId(item.id)}
              className={cx(
                "block text-sm transition-colors",
                linkClassName || "text-gray-400 hover:text-white",
                isActive && (activeLinkClassName || "text-white")
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

