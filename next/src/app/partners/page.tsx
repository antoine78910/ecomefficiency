import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partenaires — Marque blanche | Ecom Efficiency",
  description:
    "Lancez votre offre en marque blanche : domaine, branding, tarifs, et portail partenaire. Déployez votre SaaS rapidement et monétisez votre audience.",
};

function isPartnersHost(hostHeader: string) {
  const hostname = (hostHeader || "").toLowerCase().split(":")[0].replace(/^www\./, "");
  return hostname === "partners.localhost" || hostname.startsWith("partners.");
}

export default async function PartnersWhiteLabelLandingPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";

  // Keep this LP scoped to partners.* (avoid exposing it on the main marketing site).
  if (!isPartnersHost(host)) redirect("/");
  // Alias: old /partners route now points to the new /lp.
  redirect("/lp");
}

