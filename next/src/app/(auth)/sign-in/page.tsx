"use client";
import SignIn from "@/pages/SignIn";
import { useEffect } from "react";
import { postGoal } from "@/lib/analytics";

export default function SignInPage() {
  useEffect(() => { 
    try {
      postGoal('view_sign_in');
    } catch (error) {
      // Silently fail analytics - don't break the page
      console.error('[SignInPage] Analytics error:', error);
    }
  }, []);
  return <SignIn />;
}


