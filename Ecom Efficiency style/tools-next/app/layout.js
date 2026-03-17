import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Ecom Efficiency Tools",
  description: "Ecom Efficiency tools",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/img/Favicon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700;900&family=Montserrat:wght@500;600;800&family=Open+Sans:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ position: "relative", overflow: "hidden" }}>
        <Script src="https://t.contentsquare.net/uxa/af705d190c606.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}

