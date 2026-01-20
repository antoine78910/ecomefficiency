"use client";

import React from "react";

/**
 * Option B (multi-tenant): ensure the currently logged-in user is locked to the tenant
 * derived from the current hostname. This is a best-effort client call.
 */
export default function EnsureTenantMembership() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tenant/ensure", { method: "POST" });
        // ignore all errors (unauth, mismatch, etc.) — UI can handle access separately
        if (!cancelled) void res;
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

