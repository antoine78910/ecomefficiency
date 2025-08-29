import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ecom Efficiency",
  description: "50+ premium tools with a modern UI",
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
