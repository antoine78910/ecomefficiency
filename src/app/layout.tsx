import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

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
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Script id="crisp-config" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="69577169-0422-43d4-a553-a7d4776fde6f";`}
        </Script>
        <Script id="crisp-loader" strategy="afterInteractive" src="https://client.crisp.chat/l.js" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
