"use client";

import { loginGuest } from "@/app/actions/guest";
import { Zap } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function GuestLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("Checking guest access...");

  useEffect(() => {
    if (!token) {
      setStatus("Invalid link. No access token provided.");
      return;
    }

    const login = async () => {
      try {
        const result = await loginGuest(token);

        if (result?.error) {
            setStatus("Invalid or expired guest link.");
        } else {
            setStatus("Welcome! Redirecting to upload...");
            // Redirect to upload page
            // We use window.location to ensure full reload/state reset if needed, 
            // but router.push is fine since we set a cookie.
            // router.refresh() might be needed to pick up the cookie in server components? 
            // Yes, better to force refresh or use router.refresh() then push.
            router.refresh();
            router.push("/upload-memory");
        }
      } catch (error) {
        setStatus("An error occurred. Please try again.");
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
        <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Guest Access</h2>
        <p className="text-[#5B2D7D]/80 animate-pulse font-medium">{status}</p>
      </div>
    </div>
  );
}

export default function GuestLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GuestLoginContent />
        </Suspense>
    )
}
