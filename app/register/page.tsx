"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/app/actions/auth";
import { authenticate } from "@/app/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await registerUser(prevState, formData);
    if (result?.error) return result.error;
    if (result?.success) {
      // Auto-login after successful registration
      // We reuse the authenticate action but we need to make sure formData has email/password
      // The formData already has email/password from the registration form
      const loginResult = await authenticate(undefined, formData);
      if (loginResult) return loginResult; // standard auth error string
      // If no error, wait for redirect or push router
      // Authenticate usually redirects, but if we are here, we might need to handle it.
      // However, server actions redirect by throwing an error, so if `authenticate` redirects, this code won't run past it.
      return null;
    }
    return null;
  }, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign up to get started
          </p>
        </div>

        <form action={formAction} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                placeholder="John Doe"
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                placeholder="••••••••"
              />
            </div>

            {/* Note: Server action validation doesn't check confirmPassword, removing reliance on client state validation.
                Ideally we add Zod refine for confirmPassword if we send it.
                For now, simplified to just password to match action schema.
            */}
          </div>

          <RegisterButton />

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-zinc-900 dark:text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RegisterButton() {
  const { pending } = useFormStatus();
 
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

import { useFormStatus } from "react-dom";

