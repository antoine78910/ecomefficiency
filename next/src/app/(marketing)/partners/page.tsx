import type { Metadata } from "next";
import Partners from "@/screens/Partners";

export const metadata: Metadata = {
  title: "Partners | Ecom Efficiency",
  description: "Discover our partner websites and exclusive offers for the Ecom Efficiency community.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return <Partners />;
}

