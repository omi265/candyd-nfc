"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { toast } from "sonner";
import Image from "next/image";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordContent() {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        toast.error("Invalid or missing reset token");
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
      const result = await resetPassword(token, password);
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

  if (!token && !isSuccess) {
      return (
        <div className="w-full max-w-md space-y-8 bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50 text-center">
            <h1 className="text-2xl font-bold text-primary-purple">Invalid Token</h1>
            <p className="text-sm text-text-gray">The password reset link is invalid or has expired.</p>
            <Link href="/login/forgot-password" className="w-full inline-block rounded-2xl bg-primary-purple px-4 py-3.5 text-sm font-bold text-white mt-4">
                Request new link
            </Link>
        </div>
      );
  }

  return (
    <div className="w-full max-w-md space-y-8 bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/50">
        <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 mb-4 relative flex items-center justify-center">
                <Image src="/Candyd_logo.svg" alt="Candyd Logo" fill className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-purple">
                {isSuccess ? "Password updated" : "Set new password"}
            </h1>
            <p className="mt-2 text-sm text-text-gray">
                {isSuccess 
                    ? "Your password has been reset successfully" 
                    : "Create a strong password for your account"}
            </p>
        </div>

        {!isSuccess ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-4">
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
