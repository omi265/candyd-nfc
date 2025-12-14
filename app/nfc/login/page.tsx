"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function NFCLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("Authenticating...");

  useEffect(() => {
    if (!token) {
      setStatus("No token found. Please tap the tag again.");
      return;
    }

    const login = async () => {
      try {
        const result = await signIn("credentials", { 
          token, 
          redirect: false 
        });

        if (result?.error) {
            setStatus("Invalid or expired tag.");
        } else {
            setStatus("Success! Redirecting...");
            router.push("/");
            router.refresh();
        }
      } catch (error) {
        setStatus("An error occurred.");
      }
    };

    login();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Magic Login</h2>
        <p className="text-gray-600 animate-pulse">{status}</p>
      </div>
    </div>
  );
}

export default function NFCLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NFCLoginContent />
        </Suspense>
    )
}
