"use client";
import React from "react";

export default function VerifyEmailPage() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const email = params.get('email') || ''
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Verify your email</h1>
        <p className="text-gray-300 mb-6">We sent a confirmation link {email ? <>to <span className="text-white font-medium">{email}</span></> : 'to your email address'}. Open your inbox and click the link to activate your account.</p>
        <p className="text-sm text-gray-500">If you can’t find the email, check your spam/promotions folder. You can keep this tab open and sign in after confirming.</p>
      </div>
    </div>
  );
}


