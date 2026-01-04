"use client";

import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getProductWithType } from "@/app/actions/life-charm";

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
            // Fetch product info including type for routing
            const product = await getProductWithType(token);
            if (product) {
                // Route based on charm type
                switch (product.type) {
                    case "LIFE":
                        window.location.href = `/life-charm?charmId=${product.id}`;
                        break;
                    case "HABIT":
                        window.location.href = `/habit-charm?charmId=${product.id}`;
                        break;
                    case "MEMORY":
                    default:
                        window.location.href = "/";
                }
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
             <Zap className="w-8 h-8 text-[#5B2D7D]" />
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
