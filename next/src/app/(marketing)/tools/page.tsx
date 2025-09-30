"use client";
import Tools from "@/screens/Tools";
import { postGoal } from "@/lib/analytics";

export default function ToolsPage() {
  if (typeof window !== 'undefined') {
    postGoal('view_tools');
  }
  return <Tools />;
}


