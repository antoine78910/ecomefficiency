"use client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function RouteLoaderProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    let timeout: any;
    let failSafe: any;
    const start = () => {
      clearTimeout(timeout);
      clearTimeout(failSafe);
      setLoading(true);
      // Fail‑safe: never keep loader forever
      failSafe = setTimeout(() => setLoading(false), 2500);
    };
    const stop = () => {
      clearTimeout(failSafe);
      timeout = setTimeout(() => setLoading(false), 120);
    };
    const onPop = () => start();
    const onLoad = () => stop();
    const onPageShow = () => stop();
    const onVisibility = () => { if (document.visibilityState === 'visible') stop(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', start);
      window.addEventListener('popstate', onPop);
      window.addEventListener('load', onLoad);
      window.addEventListener('pageshow', onPageShow);
      document.addEventListener('visibilitychange', onVisibility);
      const handler = (e: any) => {
        const a = e.target?.closest?.('a');
        if (a && a.href && a.target !== '_blank' && a.origin === location.origin) {
          // Skip same-hash or same-path anchors
          try {
            const url = new URL(a.href);
            if (url.pathname === location.pathname && url.hash) return;
          } catch {}
          start();
        }
      };
      document.addEventListener('click', handler, true);
      return () => {
        window.removeEventListener('beforeunload', start);
        window.removeEventListener('popstate', onPop);
        window.removeEventListener('load', onLoad);
        window.removeEventListener('pageshow', onPageShow);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('click', handler, true);
        clearTimeout(timeout);
        clearTimeout(failSafe);
      };
    }
  }, []);

  // Hide loader whenever the current route changes (App Router navigations),
  // including when landing on /sign-in or any other page.
  useEffect(() => {
    // Small defer to avoid flicker during immediate hydration of the new route
    const t = setTimeout(() => setLoading(false), 80);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <>
      {loading && (
        <div style={{ position:'fixed', inset:0, background:'#000000', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2147483647 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <span style={{ display:'inline-block', width:3, height:20, background:'#9e4cfc', borderRadius:10, animation:'ee-scale 1s linear infinite' }} />
            <span style={{ display:'inline-block', width:3, height:35, background:'#9e4cfc', borderRadius:10, margin:'0 5px', animation:'ee-scale 1s linear infinite', animationDelay:'.25s' }} />
            <span style={{ display:'inline-block', width:3, height:20, background:'#9e4cfc', borderRadius:10, animation:'ee-scale 1s linear infinite', animationDelay:'.5s' }} />
          </div>
          <style>{`@keyframes ee-scale{20%{transform:scaleY(1.5)}40%{transform:scaleY(1)}}`}</style>
        </div>
      )}
      {children}
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouteLoaderProvider>
          {children}
        </RouteLoaderProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}


