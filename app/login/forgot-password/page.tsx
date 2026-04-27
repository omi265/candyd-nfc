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
  const [devCode, setDevCode] = useState("");
  const [showContinue, setShowContinue] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      const result = await forgotPassword(email);
      if (result.error) {
        toast.error(result.error);
        setDevCode("");
        setShowContinue(false);
      } else {
        if (result.devCode) {
          setDevCode(result.devCode);
          toast.success(`Dev reset code: ${result.devCode}`, { duration: 10000 });
        } else {
          setDevCode("");
          toast.success("Reset code sent to your email!");
        }
        setShowContinue(true);
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
                    Enter your email to receive a 6-digit password reset code
                </p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {devCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Development Reset Code</p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-[0.35em] text-amber-900">{devCode}</p>
                </div>
            )}

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
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
            </button>

            {showContinue && (
                <button
                    type="button"
                    onClick={() => {
                        const params = new URLSearchParams({ email });
                        if (devCode) params.set("devCode", devCode);
                        router.push(`/login/reset-password?${params.toString()}`);
                    }}
                    className="w-full rounded-2xl border border-primary-purple/15 bg-white px-4 py-3.5 text-sm font-bold text-primary-purple hover:bg-primary-purple/5 transition-all"
                >
                    Continue To Reset Password
                </button>
            )}

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
      </div>
    </div>
  );
}
