import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import GlobalGetStartedClickTracker from "@/components/GlobalGetStartedClickTracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://ecomefficiency.com"),
  title: "Ecom Efficiency",
  description: "Save $4000+ every month — #1 groupbuy for ecommerce and online business",
  openGraph: {
    type: "website",
    url: "https://ecomefficiency.com/",
    title: "Access +50 SEO / SPY / AI tools",
    description: "Save $4000+ every month — #1 groupbuy for ecommerce and online business",
    siteName: "Ecom Efficiency",
    images: [
      {
        url: "/header_ee.png",
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
        <Script
          id="datafast"
          defer
          data-website-id="68b204c706eb977058661627"
          data-domain="ecomefficiency.com"
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
        />
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
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Script id="crisp-config" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="69577169-0422-43d4-a553-a7d4776fde6f";`}
        </Script>
        <Script id="crisp-loader" strategy="afterInteractive" src="https://client.crisp.chat/l.js" />
        <Providers>
          <GlobalGetStartedClickTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
