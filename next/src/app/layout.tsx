import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import DataFastScript from "@/components/DataFastScript";
import CrispScript from "@/components/CrispScript";
import GlobalGetStartedClickTracker from "@/components/GlobalGetStartedClickTracker";
import FirstPromoterScript from "@/components/FirstPromoterScript";
import FirstPromoterAttributionGuard from "@/components/FirstPromoterAttributionGuard";
import { CANONICAL_ORIGIN } from "@/lib/canonicalOrigin";

const GOOGLE_ADS_ID = "AW-18002488181";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    template: "EcomEfficiency - %s",
  },
  description:
    "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
  openGraph: {
    type: "website",
    url: `${CANONICAL_ORIGIN}/`,
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description: "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
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
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description: "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
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
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ecom Efficiency",
    description:
      "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
    url: CANONICAL_ORIGIN,
    logo: `${CANONICAL_ORIGIN}/ecomefficiency.png`,
    sameAs: [
      "https://x.com/EcomEfficiency",
      "https://www.instagram.com/ecom.efficiency/",
      "https://www.tiktok.com/@ecom.efficiency",
      "https://discord.gg/7UgABk3jKJ",
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: `${CANONICAL_ORIGIN}/`,
    name: "Ecom Efficiency",
    inLanguage: "en",
    description:
      "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
    },
  };

  return (
    <html lang="en" className="h-full" suppressHydrationWarning translate="no">
      <head>
        <meta name="google" content="notranslate" />
        {/* Google tag (gtag.js) - conversion measurement */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="beforeInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ADS_ID}');
            `,
          }}
        />
        <FirstPromoterScript />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="min-h-screen bg-background text-foreground overflow-x-hidden" suppressHydrationWarning>
        <DataFastScript />
        <CrispScript />
        <FirstPromoterAttributionGuard />
        <GlobalGetStartedClickTracker />
        {children}
      </body>
    </html>
  );
}
