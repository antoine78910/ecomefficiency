import React from 'react';
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const logos: Array<{ src: string; alt: string }> = [
  { src: "/tools-logos/pipiads.png", alt: "Pipiads" },
  { src: "/tools-logos/elevenlabs.png", alt: "ElevenLabs" },
  { src: "/tools-logos/canva.png", alt: "Canva" },
  { src: "/tools-logos/chatgpt.png", alt: "ChatGPT" },
  { src: "/tools-logos/atria.png", alt: "Atria" },
  { src: "/tools-logos/helium10.png", alt: "Helium10" },
  { src: "/tools-logos/capcut.png", alt: "Capcut" },
  { src: "/tools-logos/sendshort.png", alt: "SendShort" },
  { src: "/tools-logos/flair.png", alt: "Flair AI" },
  { src: "/tools-logos/fotor.png", alt: "Fotor" },
  { src: "/tools-logos/freepik.png", alt: "Freepik" },
  { src: "/tools-logos/heygen.png", alt: "Heygen" },
  { src: "/tools-logos/kalodata.png", alt: "Kalodata" },
  { src: "/tools-logos/runway.png", alt: "Runway" },
  { src: "/tools-logos/higgsfield.png", alt: "Higgsfield" },
  { src: "/tools-logos/vmake.png", alt: "Vmake" },
  { src: "/tools-logos/shophunter.png", alt: "Shophunter" },
  { src: "/tools-logos/turboscribe.png", alt: "TurboScribe" },
  { src: "/tools-logos/winninghunter.png", alt: "Winninghunter" },
  { src: "/tools-logos/exploding.png", alt: "Exploding Topics" },
  
];

// Always render 6 cases per column. If a column has fewer logos remaining,
// fill by cycling through the logos list so every case shows a logo.
const totalCols = Math.max(1, Math.ceil(logos.length / 6));
const columns: Array<Array<{ src: string; alt: string }>> = Array.from({ length: totalCols }, (_, colIdx) =>
  Array.from({ length: 6 }, (_, rowIdx) => logos[(colIdx * 6 + rowIdx) % logos.length])
);


