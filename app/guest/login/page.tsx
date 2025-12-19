"use client";

import { loginGuest } from "@/app/actions/guest";
import { Zap } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";

function GuestLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("Checking guest access...");

  const hasattemptedLogin = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("Invalid link. No access token provided.");
      return;
    }

    if (hasattemptedLogin.current) return;
    hasattemptedLogin.current = true;

    const login = async () => {
      try {
        const result = await loginGuest(token);

        if (result?.error) {
            setStatus("Invalid or expired guest link.");
        } else {
            // Force a full page reload to ensure the cookie is picked up by the server actions and middleware
            // This is safer than router.push for login flows involving cookies
            window.location.href = "/upload-memory";
        }
      } catch (error) {
        setStatus("An error occurred. Please try again.");
        hasattemptedLogin.current = false; // Allow retry on error
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
