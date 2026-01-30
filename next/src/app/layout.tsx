import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ecomefficiency.com"),
  title: {
    default: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
    template: "%s | Ecom Efficiency",
  },
  description:
    "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster. Cancel anytime.",
  openGraph: {
    type: "website",
    url: "https://www.ecomefficiency.com/",
    title: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
    description: "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month.",
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
    title: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
    description: "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month.",
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
      "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster.",
    url: "https://www.ecomefficiency.com",
    logo: "https://www.ecomefficiency.com/ecomefficiency.png",
    sameAs: [
      "https://x.com/EcomEfficiency",
      "https://www.instagram.com/ecom.efficiency/",
      "https://www.tiktok.com/@ecom.efficiency",
      "https://discord.com/invite/bKg7J625Sm",
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://www.ecomefficiency.com/",
    name: "Ecom Efficiency",
    inLanguage: "en",
    description:
      "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster.",
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
    },
  };

  return (
    <html lang="en" className="h-full" suppressHydrationWarning translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="min-h-screen bg-background text-foreground overflow-x-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
