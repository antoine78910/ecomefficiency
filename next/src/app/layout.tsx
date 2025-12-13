import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import DataFastScript from "@/components/DataFastScript";
import SupabaseSessionGuard from "@/components/SupabaseSessionGuard";
import CrossDomainLoginFlag from "@/components/CrossDomainLoginFlag";
// import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://ecomefficiency.com"),
  title: "Ecom Efficiency",
  description: "#1 groupbuy for ecommerce and online business - Save $4000+ every month",
  openGraph: {
    type: "website",
    url: "https://ecomefficiency.com/",
    title: "Access +50 SEO / SPY / AI tools",
    description: "Save $4000+ every month — #1 groupbuy for ecommerce and online business",
    siteName: "Ecom Efficiency",
    images: [
      {
        url: "/header_ee.png?v=8",
        width: 1200,
        height: 630,
        alt: "Ecom Efficiency",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Access +50 SEO / SPY / AI tools",
    description: "Save $4000+ every month — #1 groupbuy for ecommerce and online business",
    images: ["/header_ee.png?v=8"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=105104061', 'ym');

    ym(105104061, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});`}
        </Script>
        {/* FirstPromoter main tracking */}
        <Script src="/fprmain.js" strategy="afterInteractive" />
        <Script src="https://cdn.firstpromoter.com/fpr.js" strategy="afterInteractive" />
        {/* DataFast - conditionally loaded only on main domain to prevent 403 errors on subdomains */}
        <DataFastScript />
        <Script id="sonarly" strategy="beforeInteractive">
          {`var initOpts = {
  projectKey: "ZE1R9a3lE3RjdngiFmDF",
  ingestPoint: "https://sonarly.dev/ingest"
};
var startOpts = {};

(function(A,s,a,y,e,r){
  r=window.Sonarly=[e,r,y,[s-1, e]];
  s=document.createElement('script');s.src=A;s.async=!a;
  document.getElementsByTagName('head')[0].appendChild(s);
  r.start=function(v){r.push([0])};
  r.stop=function(v){r.push([1])};
  r.setUserID=function(id){r.push([2,id])};
  r.setUserAnonymousID=function(id){r.push([3,id])};
  r.setMetadata=function(k,v){r.push([4,k,v])};
  r.event=function(k,p,i){r.push([5,k,p,i])};
  r.issue=function(k,p){r.push([6,k,p])};
  r.isActive=function(){return false};
  r.getSessionToken=function(){};
})("https://sonarly.dev/static/tracker.js?v=1763957587150",1,0,initOpts,startOpts);`}
        </Script>
        {/* Microsoft Clarity - Load early for better tracking */}
        <Script id="clarity" strategy="beforeInteractive">
          {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "u2gln16w3i");`}
        </Script>
      </head>
      <body className="min-h-screen bg-background text-foreground overflow-x-hidden" suppressHydrationWarning>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/105104061" style={{position: 'absolute', left: '-9999px'}} alt="" />
          </div>
        </noscript>
        <Script id="global-error-handler" strategy="beforeInteractive">
          {`(function() {
            // Global error handler to suppress common third-party script errors
            var originalConsoleError = console.error;
            var originalConsoleWarn = console.warn;
            
            // Enhanced console.error interceptor
            console.error = function() {
              var args = Array.prototype.slice.call(arguments);
              var message = args.join(' ');
              
              // Suppress generic "Script error." from cross-origin scripts (CORS-blocked errors)
              if (message && typeof message === 'string') {
                // Suppress "Script error." - generic browser error from cross-origin scripts
                if (message.trim() === 'Script error.' || 
                    message.includes('Script error.') && !message.includes('at ')) {
                  return; // Silently ignore generic script errors
                }
                
                // Suppress Crisp CSS-related errors (multiple formats)
                if (message.includes('crisp.chat') && 
                    (message.includes('CSS') || 
                     message.includes('stylesheet') || 
                     message.includes('NetworkError') || 
                     message.includes('Failed to fetch') ||
                     message.includes('Failed to fetch or process CSS') ||
                     (message.includes('TypeError') && message.includes('Failed to fetch')))) {
                  return;
                }
                
                // Also catch standalone "Failed to fetch" errors that might be from Crisp
                // when the error message doesn't explicitly mention crisp.chat
                if ((message.includes('Failed to fetch or process CSS') || 
                     (message.includes('TypeError') && message.includes('Failed to fetch'))) &&
                    (message.includes('client_default') || message.includes('stylesheets'))) {
                  return;
                }
                
                // Suppress DataFast HTTP 0 errors (network failures)
                if (message.includes('DataFast') && 
                    (message.includes('HTTP 0') || 
                     message.includes('Failed to track pageview') ||
                     message.includes('Failed to track custom'))) {
                  return;
                }
              }
              
              // Call original console.error for other errors
              originalConsoleError.apply(console, args);
            };
            
            // Enhanced console.warn interceptor for DataFast warnings
            console.warn = function() {
              var args = Array.prototype.slice.call(arguments);
              var message = args.join(' ');
              
              // Suppress DataFast warnings about HTTP 0
              if (message && typeof message === 'string' && 
                  message.includes('DataFast') && message.includes('HTTP 0')) {
                return;
              }
              
              // Call original console.warn for other warnings
              originalConsoleWarn.apply(console, args);
            };

            // Suppress DataFast noisy logs (HTTP 0) even if logged as info/log
            var originalConsoleLog = console.log;
            var originalConsoleInfo = console.info;
            console.log = function() {
              var args = Array.prototype.slice.call(arguments);
              var message = args.join(' ');
              if (message && typeof message === 'string' &&
                  message.includes('DataFast') && message.includes('HTTP 0')) {
                return;
              }
              originalConsoleLog.apply(console, args);
            };
            console.info = function() {
              var args = Array.prototype.slice.call(arguments);
              var message = args.join(' ');
              if (message && typeof message === 'string' &&
                  message.includes('DataFast') && message.includes('HTTP 0')) {
                return;
              }
              originalConsoleInfo.apply(console, args);
            };
            
            // Global error event handler for unhandled errors
            window.addEventListener('error', function(e) {
              // Suppress generic "Script error." from cross-origin scripts
              if (e.message === 'Script error.' || 
                  (e.message && e.message.trim() === 'Script error.' && !e.filename)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
              }
              
              // Handle LINK element errors (CSS loading)
              if (e.target) {
                var target = e.target;
                if (target.tagName === 'LINK' && target.href) {
                  // Suppress Crisp CSS loading errors
                  if (target.href.includes('crisp.chat') || 
                      target.href.includes('client_default') ||
                      (target.href.includes('stylesheets') && target.href.includes('crisp'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                  }
                }
              }
              
              // Also check error message for Crisp CSS errors even if target is not available
              if (e.message && typeof e.message === 'string') {
                var errorMsg = e.message.toLowerCase();
                if ((errorMsg.includes('failed to fetch or process css') ||
                     (errorMsg.includes('typeerror') && errorMsg.includes('failed to fetch'))) &&
                    (errorMsg.includes('crisp') || errorMsg.includes('client_default') || errorMsg.includes('stylesheets'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return false;
                }
              }
                
                // Suppress script loading errors from third-party domains
                if (target.tagName === 'SCRIPT' && target.src) {
                  var src = target.src;
                  // Suppress errors from known third-party tracking scripts
                  if (src.includes('yandex.ru') || 
                      src.includes('firstpromoter.com') || 
                      src.includes('datafa.st') || 
                      src.includes('sonarly.dev') || 
                      src.includes('clarity.ms') || 
                      src.includes('crisp.chat')) {
                    // Only suppress if it's a generic script error
                    if (!e.message || e.message === 'Script error.' || e.message.trim() === 'Script error.') {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      return false;
                    }
                  }
                }
              }
            }, true);
            
            // Catch unhandled promise rejections
            window.addEventListener('unhandledrejection', function(e) {
              var reason = e.reason;
              if (reason) {
                var reasonStr = typeof reason === 'string' ? reason : 
                               (reason.message || reason.toString() || '');
                
                // Suppress Crisp-related promise rejections
                var reasonLower = reasonStr.toLowerCase();
                if ((reasonStr.includes('crisp.chat') || reasonLower.includes('crisp')) && 
                    (reasonStr.includes('CSS') || reasonStr.includes('stylesheet') || 
                     reasonStr.includes('NetworkError') || reasonStr.includes('Failed to fetch') ||
                     reasonStr.includes('Failed to fetch or process CSS') ||
                     (reasonStr.includes('TypeError') && reasonStr.includes('Failed to fetch')))) {
                  e.preventDefault();
                  return false;
                }
                
                // Also catch standalone CSS fetch errors that might be from Crisp
                if ((reasonStr.includes('Failed to fetch or process CSS') ||
                     (reasonStr.includes('TypeError') && reasonStr.includes('Failed to fetch'))) &&
                    (reasonLower.includes('client_default') || reasonLower.includes('stylesheets'))) {
                  e.preventDefault();
                  return false;
                }
                
                // Suppress DataFast promise rejections
                if (reasonStr.includes('DataFast') && reasonStr.includes('HTTP 0')) {
                  e.preventDefault();
                  return false;
                }
              }
            });
          })();`}
        </Script>
        <Script id="crisp-config" strategy="beforeInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="69577169-0422-43d4-a553-a7d4776fde6f";`}
        </Script>
        <Script 
          id="crisp-loader" 
          strategy="afterInteractive" 
          src="https://client.crisp.chat/l.js"
        />
        <Providers>
          <CrossDomainLoginFlag />
          <SupabaseSessionGuard />
          {children}
        </Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
