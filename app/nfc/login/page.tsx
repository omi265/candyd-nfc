"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getProductIdFromToken } from "@/app/actions/memories";

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
            // Fetch product ID for redirection
            const productId = await getProductIdFromToken(token);
            if (productId) {
                window.location.href = `/?charmId=${productId}`;
            } else {
                window.location.href = "/";
            }
        }
      } catch (error) {
        setStatus("An error occurred.");
      }
    };

    login();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] font-[Outfit]">
      <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50">
        <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-[#5B2D7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
        </div>
        <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Magic Login</h2>
        <p className="text-[#5B2D7D]/80 animate-pulse font-medium">{status}</p>
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
