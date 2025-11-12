import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
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
        url: "/header_ee.png",
        width: 1465,
        height: 816,
        alt: "Ecom Efficiency",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Access +50 SEO / SPY / AI tools",
    description: "Save $4000+ every month — #1 groupbuy for ecommerce and online business",
    images: ["/header_ee.png"],
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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
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
        <Script
          id="datafast"
          defer
          data-website-id="68b204c706eb977058661627"
          data-domain="ecomefficiency.com"
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
        />
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
