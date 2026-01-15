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
  // Requested: make the 3-bar loader white everywhere (including ecomefficiency.com).
  const barColor = "#ffffff";
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
            <span style={{ display:'inline-block', width:3, height:20, background:barColor, borderRadius:10, animation:'ee-scale 1s linear infinite' }} />
            <span style={{ display:'inline-block', width:3, height:35, background:barColor, borderRadius:10, margin:'0 5px', animation:'ee-scale 1s linear infinite', animationDelay:'.25s' }} />
            <span style={{ display:'inline-block', width:3, height:20, background:barColor, borderRadius:10, animation:'ee-scale 1s linear infinite', animationDelay:'.5s' }} />
          </div>
          <style>{`@keyframes ee-scale{20%{transform:scaleY(1.5)}40%{transform:scaleY(1)}}`}</style>
        </div>
      )}
      {children}
    </>
  );
}

function RecoveryRedirect({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  useEffect(() => {
    // Redirect to /reset-password if user arrives with recovery token
    if (typeof window !== 'undefined' && pathname !== '/reset-password') {
      const hash = window.location.hash;
      // Check if URL contains recovery/password reset parameters
      if (hash.includes('type=recovery') || hash.includes('type=password_recovery')) {
        console.log('[RecoveryRedirect] Detected recovery token, redirecting to /reset-password');
        window.location.href = '/reset-password' + hash;
      }
    }
  }, [pathname]);
  
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RecoveryRedirect>
          <RouteLoaderProvider>
            {children}
          </RouteLoaderProvider>
        </RecoveryRedirect>
      </TooltipProvider>
    </QueryClientProvider>
  );
}


