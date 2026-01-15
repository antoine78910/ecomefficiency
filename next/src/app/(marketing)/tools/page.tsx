import { carouselTools } from "@/data/carouselTools";
import ToolsGridClient, { type ToolCard } from "./ToolsGridClient";
import styles from "./tools.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ToolsPage() {
  const tools: ToolCard[] = carouselTools.map((t) => ({
    href: "/signup",
    img: t.icon,
    title: t.name,
    description: t.description,
  }));

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Tools</h1>
      <ToolsGridClient tools={tools} />
    </div>
  );
}

