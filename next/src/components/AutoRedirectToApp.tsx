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

