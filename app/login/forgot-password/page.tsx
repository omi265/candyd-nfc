"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { toast } from "sonner";
import Image from "next/image";
import { ChevronLeft, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      const result = await forgotPassword(email);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsSubmitted(true);
        toast.success("Reset link sent to your email!");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 font-[family-name:var(--font-outfit)]">
      <div className="w-full max-w-md space-y-8 bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50">
        <div className="relative">
            <button 
                onClick={() => router.back()} 
                className="absolute -left-2 -top-2 w-10 h-10 flex items-center justify-center text-primary-purple/60 hover:text-primary-purple transition-colors"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-4 relative flex items-center justify-center">
                    <Image src="/Candyd_logo.svg" alt="Candyd Logo" fill className="object-contain" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-primary-purple">
                    Forgot password?
                </h1>
                <p className="mt-2 text-sm text-text-gray">
                    {isSubmitted 
                        ? "Check your email for a reset link" 
                        : "Enter your email to receive a password reset link"}
                </p>
            </div>
        </div>

        {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-primary-purple ml-3 mb-1.5"
                    >
                        Email address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-purple/20" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 pl-12 text-foreground placeholder-text-gray/40 focus:ring-2 focus:ring-primary-purple/20 transition-all outline-none shadow-sm"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-2xl bg-primary-purple px-4 py-3.5 text-sm font-bold text-white hover:bg-primary-purple/90 focus:outline-none focus:ring-4 focus:ring-primary-purple/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-purple/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                </button>

                <p className="text-center text-sm text-text-gray">
                    Remember your password?{" "}
                    <Link
                        href="/login"
                        className="font-bold text-primary-purple hover:underline"
                    >
                        Back to login
                    </Link>
                </p>
            </form>
        ) : (
            <div className="mt-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <Mail className="w-8 h-8" />
                </div>
                <p className="text-sm text-text-gray px-4">
                    We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                    If you don&apos;t see it within a few minutes, please check your spam folder.
                </p>
                <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm font-bold text-primary-purple hover:underline"
                >
                    Try another email
                </button>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="w-full inline-block rounded-2xl border border-primary-purple/20 px-4 py-3.5 text-sm font-bold text-primary-purple hover:bg-primary-purple/5 transition-all"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
