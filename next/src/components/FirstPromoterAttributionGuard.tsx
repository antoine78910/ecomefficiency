"use client";

import React from "react";

const FPR_STORAGE_KEY = "__ee_firstpromoter_fpr";

function getStoredFpr() {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(FPR_STORAGE_KEY) ||
      window.sessionStorage.getItem(FPR_STORAGE_KEY) ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

function storeFpr(value: string) {
  if (typeof window === "undefined") return;
  const next = String(value || "").trim();
  if (!next) return;
  try {
    window.localStorage.setItem(FPR_STORAGE_KEY, next);
    window.sessionStorage.setItem(FPR_STORAGE_KEY, next);
  } catch {}
}

function shouldCarryFpr(pathname: string) {
  const p = String(pathname || "");
  return (
    p === "/sign-up" ||
    p.startsWith("/sign-up/") ||
    p === "/sign-in" ||
    p.startsWith("/sign-in/") ||
    p === "/" ||
    p === "/app" ||
    p.startsWith("/app/") ||
    p === "/getting-started" ||
    p.startsWith("/getting-started/")
  );
}

export default function FirstPromoterAttributionGuard() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const persistCurrentFpr = () => {
      try {
        const url = new URL(window.location.href);
        const currentFpr = String(url.searchParams.get("fpr") || "").trim();
        if (currentFpr) storeFpr(currentFpr);
      } catch {}
    };

    const ensureFprOnCurrentAuthPage = () => {
      try {
        const url = new URL(window.location.href);
        if (!shouldCarryFpr(url.pathname)) return;
        if (url.searchParams.get("fpr")) {
          storeFpr(String(url.searchParams.get("fpr") || ""));
          return;
        }
        const storedFpr = getStoredFpr();
        if (!storedFpr) return;
        url.searchParams.set("fpr", storedFpr);
        window.history.replaceState({}, "", url.toString());
      } catch {}
    };

    persistCurrentFpr();
    ensureFprOnCurrentAuthPage();

    const handleClick = (event: MouseEvent) => {
      try {
        const target = event.target as Element | null;
        const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = String(anchor.getAttribute("href") || "").trim();
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        const nextUrl = new URL(href, window.location.origin);
        if (nextUrl.origin !== window.location.origin) return;
        if (!shouldCarryFpr(nextUrl.pathname)) return;
        if (nextUrl.searchParams.get("fpr")) {
          storeFpr(String(nextUrl.searchParams.get("fpr") || ""));
          return;
        }

        const storedFpr = getStoredFpr();
        if (!storedFpr) return;

        nextUrl.searchParams.set("fpr", storedFpr);
        event.preventDefault();
        window.location.assign(nextUrl.toString());
      } catch {}
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true } as any);
  }, []);

  return null;
}
