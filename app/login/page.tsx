"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticate } from "@/app/actions/auth";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);
  const router = useRouter();

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 font-[family-name:var(--font-outfit)]">
      <div className="w-full max-w-md space-y-8 bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50">
        <div className="flex flex-col items-center text-center">
            <div className="w-64 h-64 -mb-4 relative flex items-center justify-center">
                <Image src="/green_logo.png" alt="OUR DVE Logo" fill className="object-contain" priority />
            </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#556B5A]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[#556B5A]/70">
            Sign in to your account to continue
          </p>
        </div>

        <form action={dispatch} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
              <p className="text-sm text-red-600 font-medium text-center">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-green-dark ml-3 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 text-foreground placeholder-text-gray/40 focus:ring-2 focus:ring-primary-green-dark/20 transition-all outline-none shadow-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-primary-green-dark ml-3 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 text-foreground placeholder-text-gray/40 focus:ring-2 focus:ring-primary-green-dark/20 transition-all outline-none shadow-sm"
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-2 px-2">
                <Link 
                  href="/login/forgot-password"
                  className="text-xs font-semibold text-primary-green-dark/60 hover:text-primary-green-dark hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <LoginButton />

          <p className="text-center text-sm text-text-gray">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-primary-green-dark hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();
 
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[#7C9A86] hover:bg-[#556B5A] px-4 py-3.5 text-sm font-bold text-white focus:outline-none focus:ring-4 focus:ring-[#7C9A86]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#7C9A86]/25 active:scale-[0.98]"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

