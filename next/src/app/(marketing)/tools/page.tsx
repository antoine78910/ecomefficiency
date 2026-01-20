import type { Metadata } from "next";
import Tools from "@/screens/Tools";

export const metadata: Metadata = {
  title: "Tools | Ecom Efficiency",
  description: "Explore 50+ premium e-commerce, spy, SEO and AI tools included in your Ecom Efficiency subscription.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return <Tools />;
}
