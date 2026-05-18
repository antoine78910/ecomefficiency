"use client";

import type { ComponentProps } from "react";
import AnimatedSectionHeader from "@/components/AnimatedSectionHeader";

export type LpSectionHeaderProps = ComponentProps<typeof AnimatedSectionHeader>;

export default function LpSectionHeader(props: LpSectionHeaderProps) {
  return <AnimatedSectionHeader preset="lp" {...props} />;
}
