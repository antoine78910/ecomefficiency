"use client";
import React from "react";
import { postGoal } from "@/lib/analytics";

type GoalClientProps = {
  name: string;
  metadata?: Record<string, string>;
};

export default function GoalClient({ name, metadata }: GoalClientProps) {
  React.useEffect(() => {
    try {
      postGoal(name, metadata);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}


