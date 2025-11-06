"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const email = params.get('email') || ''
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/ecomefficiency.png" 
            alt="Ecom Efficiency Logo" 
            className="h-12 w-auto mx-auto mb-4"
          />
        </div>

        <Card className="bg-gray-900/50 border border-purple-500/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-purple-500/20 p-3">
                <Mail className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-white text-2xl">Verify your email</CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              We sent a confirmation link {email ? (
                <>to <span className="text-white font-medium">{email}</span></>
              ) : (
                'to your email address'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium text-white mb-1">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400">
                    <li>Open your inbox and look for our email</li>
                    <li>Click the confirmation link in the email</li>
                    <li>You'll be automatically signed in</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <p className="text-xs text-gray-400 text-center">
                <span className="font-medium text-gray-300">Can't find the email?</span>
                <br />
                Check your spam/promotions folder. You can keep this tab open and sign in after confirming.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-700/50">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-400">
                  Already verified?{" "}
                  <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
                <Link 
                  href="/" 
                  className="block text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  ← Back to home
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
