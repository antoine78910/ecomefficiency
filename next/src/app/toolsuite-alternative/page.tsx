import { redirect } from "next/navigation";

/** SEO alias: canonical comparison lives at /alternatives/toolsuite */
export default function ToolSuiteAlternativeRedirectPage() {
  redirect("/alternatives/toolsuite");
}
