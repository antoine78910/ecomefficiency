"use client";
import SignUp from "@/screens/SignUp";
import { useEffect } from "react";
import { postGoal } from "@/lib/analytics";

export default function SignUpPage() {
  useEffect(() => { postGoal('view_sign_up'); }, []);
  return <SignUp />;
}


