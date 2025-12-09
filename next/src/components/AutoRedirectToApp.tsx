"use client";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function computeAppUrl() {
  try {
    const { protocol, hostname, port } = window.location;
    const isLocal =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const isAppHost = hostname.startsWith("app.");
    if (isAppHost) return null; // déjà sur app.*

    // Garder le port en local si présent
    if (isLocal) {
      const portPart = port ? `:${port}` : "";
      return `${protocol}//app.localhost${portPart}/`;
    }

    // Domaine public : app.<domaine sans www>
    const cleanHost = hostname.replace(/^www\./, "");
    return `${protocol}//app.${cleanHost}/`;
  } catch {
    return null;
  }
}

export default function AutoRedirectToApp() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        const target = computeAppUrl();
        if (!target) return;

        // Heuristique cookie cross-domaine (déposé depuis app.*)
        const hasPlanCookie = typeof document !== 'undefined' && /(^|; )user_plan=/.test(document.cookie || '');

        // Si cookie plan est présent, on peut rediriger même sans session locale
        if (hasPlanCookie) {
          window.location.href = target;
          return;
        }

        // Fallback : vérifier côté backend Stripe + poser le cookie cross-domain si actif
        try {
          const verifyRes = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          }).catch(() => null);
          if (verifyRes && verifyRes.ok) {
            const data = await verifyRes.json().catch(() => ({}));
            if (data?.active && data?.plan) {
              try {
                const { hostname } = window.location;
                const isProd = /\.ecomefficiency\.com$/i.test(hostname) || hostname === 'ecomefficiency.com' || hostname === 'www.ecomefficiency.com';
                const domainAttr = isProd ? '; Domain=.ecomefficiency.com' : '';
                document.cookie = `user_plan=${encodeURIComponent(data.plan)}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax${domainAttr}`;
                window.location.href = target;
                return;
              } catch {}
            }
          }
        } catch {}

        const user = data?.user;
        if (error || !user) return;

        // Rediriger seulement si on n'est pas déjà sur app.*
        window.location.href = target;
      } catch {
        // en cas d'erreur, ne rien faire (pas de boucle)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

