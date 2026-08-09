"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { toast } from "sonner";
import Image from "next/image";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, KeyRound, Mail } from "lucide-react";

function ResetPasswordContent() {
  const [isPending, startTransition] = useTransition();
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const devCode = searchParams.get("devCode") || "";
  const [email, setEmail] = useState(emailFromUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        toast.error("Email is required");
        return;
    }

    if (!otp || otp.length !== 6) {
        toast.error("Please enter a valid 6-digit code");
        return;
    }

    if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
    }

    if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
    }

    startTransition(async () => {
      const result = await resetPassword(email, otp, password);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
            router.push("/login");
        }, 3000);
      }
    });
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50">
        <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 mb-4 relative flex items-center justify-center">
                <Image src="/beige png.png" alt="Candyd Logo" fill className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-purple">
                {isSuccess ? "Password updated" : "Reset password"}
            </h1>
            <p className="mt-2 text-sm text-text-gray">
                {isSuccess 
                    ? "Your password has been reset successfully" 
                    : "Enter the 6-digit code sent to your email"}
            </p>
        </div>

        {!isSuccess ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {devCode && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Development Reset Code</p>
                        <p className="mt-1 font-mono text-2xl font-black tracking-[0.35em] text-amber-900">{devCode}</p>
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-primary-purple ml-3 mb-1.5 uppercase tracking-wider text-[10px]">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-purple/20" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 pl-12 text-foreground focus:ring-2 focus:ring-primary-purple/20 transition-all outline-none shadow-sm"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary-purple ml-3 mb-1.5 uppercase tracking-wider text-[10px]">
                            6-Digit Code
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-purple/20" />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                required
                                maxLength={6}
                                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 pl-12 text-foreground focus:ring-2 focus:ring-primary-purple/20 transition-all outline-none shadow-sm tracking-[0.5em] font-mono text-lg"
                                placeholder="000000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary-purple ml-3 mb-1.5 uppercase tracking-wider text-[10px]">
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-purple/20" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 pl-12 text-foreground focus:ring-2 focus:ring-primary-purple/20 transition-all outline-none shadow-sm"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-purple/40"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary-purple ml-3 mb-1.5 uppercase tracking-wider text-[10px]">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-purple/20" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 pl-12 text-foreground focus:ring-2 focus:ring-primary-purple/20 transition-all outline-none shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-2xl bg-primary-purple px-4 py-3.5 text-sm font-bold text-white hover:bg-primary-purple/90 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </button>
            </form>
        ) : (
            <div className="mt-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-sm text-text-gray px-4">
                    Redirecting you to the login page...
                </p>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="w-full inline-block rounded-2xl bg-primary-purple px-4 py-3.5 text-sm font-bold text-white"
                    >
                        Login Now
                    </Link>
                </div>
            </div>
        )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 font-[family-name:var(--font-outfit)]">
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary-purple" />}>
            <ResetPasswordContent />
        </Suspense>
    </div>
  );
}
