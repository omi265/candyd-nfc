"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  requestRegistrationVerification,
  resendRegistrationVerification,
  verifyRegistrationCode,
} from "@/app/actions/auth";

type RegistrationStep = "details" | "verify" | "complete";

export default function RegisterPage() {
  const [step, setStep] = useState<RegistrationStep>("details");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    try {
      const result = await requestRegistrationVerification(new FormData(event.currentTarget));
      if (result?.error) {
        setMessage(result.error);
        return;
      }

      if (result?.success && result.email) {
        setVerifiedEmail(result.email);
        setStep("verify");
      }
    } catch (error) {
      console.error("Registration request failed:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    try {
      const result = await verifyRegistrationCode(verifiedEmail, code);
      if (result?.error) {
        setMessage(result.error);
        return;
      }

      if (result?.success) {
        setStep("complete");
      }
    } catch (error) {
      console.error("Registration verification failed:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleResend = async () => {
    setIsPending(true);
    setMessage(null);

    try {
      const result = await resendRegistrationVerification(verifiedEmail);
      setMessage(result?.error || "A new verification code has been sent.");
    } catch (error) {
      console.error("Verification resend failed:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const startAgain = () => {
    setStep("details");
    setCode("");
    setMessage(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 font-[family-name:var(--font-outfit)]">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/50 bg-white/40 p-8 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative -mb-4 flex h-64 w-64 items-center justify-center">
            <Image src="/green_logo.png" alt="Our DVE Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#556B5A]">
            {step === "details" && "Create an account"}
            {step === "verify" && "Verify your email"}
            {step === "complete" && "Email verified"}
          </h1>
          <p className="mt-2 text-sm text-[#556B5A]/70">
            {step === "details" && "Sign up to get started"}
            {step === "verify" && `We sent a 6-digit code to ${verifiedEmail}`}
            {step === "complete" && "Your Our DVE account is ready"}
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-[#E6DED1] bg-white/70 p-4" aria-live="polite">
            <p className="text-center text-sm font-medium text-[#556B5A]">{message}</p>
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleRegistration} className="mt-8 space-y-6">
            <div className="space-y-4">
              <Field label="Full name" id="name" type="text" autoComplete="name" placeholder="John Doe" required />
              <Field label="Email address" id="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              <Field label="Phone number (optional)" id="contact" type="tel" autoComplete="tel" placeholder="+1 234 567 8900" />
              <Field label="Password" id="password" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={6} />
            </div>

            <SubmitButton pending={isPending} pendingLabel="Sending code...">Create account</SubmitButton>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerification} className="mt-8 space-y-6">
            <div>
              <label htmlFor="verification-code" className="mb-1.5 ml-3 block text-sm font-medium text-primary-green-dark">
                Verification code
              </label>
              <input
                id="verification-code"
                name="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 text-center text-2xl tracking-[0.4em] text-foreground shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary-green-dark/20"
                placeholder="000000"
              />
            </div>

            <SubmitButton pending={isPending} pendingLabel="Verifying...">Verify email</SubmitButton>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={startAgain} disabled={isPending} className="font-medium text-[#556B5A] hover:underline disabled:opacity-50">
                Change details
              </button>
              <button type="button" onClick={handleResend} disabled={isPending} className="font-bold text-primary-green-dark hover:underline disabled:opacity-50">
                Resend code
              </button>
            </div>
          </form>
        )}

        {step === "complete" && (
          <Link
            href="/login"
            className="block w-full rounded-2xl bg-[#7C9A86] px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-[#7C9A86]/25 transition-all hover:bg-[#556B5A] active:scale-[0.98]"
          >
            Continue to sign in
          </Link>
        )}

        {step !== "complete" && (
          <p className="text-center text-sm text-text-gray">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary-green-dark hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  id: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
};

function Field({ label, id, ...inputProps }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 ml-3 block text-sm font-medium text-primary-green-dark">
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...inputProps}
        className="block w-full rounded-2xl border-none bg-white px-5 py-3.5 text-foreground shadow-sm outline-none transition-all placeholder:text-text-gray/40 focus:ring-2 focus:ring-primary-green-dark/20"
      />
    </div>
  );
}

function SubmitButton({ pending, pendingLabel, children }: { pending: boolean; pendingLabel: string; children: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[#7C9A86] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7C9A86]/25 transition-all hover:bg-[#556B5A] focus:outline-none focus:ring-4 focus:ring-[#7C9A86]/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
