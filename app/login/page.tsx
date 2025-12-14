"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticate } from "@/app/actions/auth";

export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);
  const router = useRouter();
  
  // Checking for specific error params in URL (optional, NextAuth often adds them)
  // const searchParams = useSearchParams();
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to your account to continue
          </p>
        </div>

        <form action={dispatch} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          <LoginButton />

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-zinc-900 dark:text-white hover:underline"
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
      className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

// Simple useFormStatus hook shim if using older Next.js or to keep it clean, 
// but actually `react-dom` exports it. 
import { useFormStatus } from "react-dom";

