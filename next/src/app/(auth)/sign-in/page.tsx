"use client";
import SignIn from "@/screens/SignIn";
import { useEffect } from "react";
import { postGoal } from "@/lib/analytics";

export default function SignInPage() {
  useEffect(() => { postGoal('view_sign_in'); }, []);
  return <SignIn />;
}


