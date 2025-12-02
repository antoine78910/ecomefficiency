import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import DataFastScript from "@/components/DataFastScript";
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
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/105104061" style={{position: 'absolute', left: '-9999px'}} alt="" />
          </div>
        </noscript>
        <Script id="crisp-config" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="69577169-0422-43d4-a553-a7d4776fde6f";`}
        </Script>
        <Script id="crisp-loader" strategy="afterInteractive" src="https://client.crisp.chat/l.js" />
        <Providers>
          {children}
        </Providers>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
