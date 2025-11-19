import Tools from "@/screens/Tools";
import GoalClient from "@/components/GoalClient";

// Static marketing page to avoid runtime cost
export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export default function ToolsPage() {
  return (
    <>
      <GoalClient name="view_tools" />
      <Tools />
    </>
  );
}


