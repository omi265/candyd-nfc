"use client";

import { signIn } from "next-auth/react";
import { Zap, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getProductWithType } from "@/app/actions/life-charm";
import { getProductOwnerInfo } from "@/app/actions/nfc";

function NFCLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  
  const [status, setStatus] = useState("Checking security...");
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("No token found. Please tap the tag again.");
      setIsLoading(false);
      return;
    }

    const checkTrustAndLogin = async () => {
        try {
            // 1. Check if this device is trusted for this specific token
            const isTrusted = localStorage.getItem(`trusted_tag_${token}`);

            if (isTrusted === "true") {
                // Device is trusted -> Attempt Magic Login
                setStatus("Authenticating...");
                await performTokenLogin(token);
            } else {
                // Device NOT trusted -> Fetch info and ask for password
                setStatus("Verifying tag...");
                const info = await getProductOwnerInfo(token);
                
                if (info) {
                    setOwnerInfo(info);
                    setNeedsPassword(true);
                    setIsLoading(false);
                } else {
                    setStatus("Invalid tag.");
                    setIsLoading(false);
                }
            }
        } catch (e) {
            console.error(e);
            setStatus("An error occurred.");
            setIsLoading(false);
        }
    };

    checkTrustAndLogin();
  }, [token]);

  const performTokenLogin = async (tokenToUse: string) => {
      const result = await signIn("credentials", {
          token: tokenToUse,
          redirect: false
      });

      if (result?.error) {
          setStatus("Tag invalid or expired.");
          setIsLoading(false);
          // If token login fails (maybe user revoked access?), we might want to clear trust
          localStorage.removeItem(`trusted_tag_${tokenToUse}`);
      } else {
          setStatus("Success! Redirecting...");
          await handleRedirect(tokenToUse);
      }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      if (!ownerInfo?.email) return;

      try {
          const result = await signIn("credentials", {
              email: ownerInfo.email,
              password: password,
              redirect: false
          });

          if (result?.error) {
              setError("Incorrect password.");
              setIsLoading(false);
          } else {
              // Success! Trust this device
              if (token) {
                  localStorage.setItem(`trusted_tag_${token}`, "true");
                  setStatus("Verified! Redirecting...");
                  await handleRedirect(token);
              }
          }
      } catch (e) {
          setError("Login failed. Please try again.");
          setIsLoading(false);
      }
  };

  const handleRedirect = async (currentToken: string) => {
      const product = await getProductWithType(currentToken);
      if (product) {
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
  };

  // Helper to mask email
  const maskEmail = (email: string) => {
      const [name, domain] = email.split("@");
      if (!name || !domain) return email;
      const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : `${name}***`;
      return `${maskedName}@${domain}`;
  };

  if (isLoading && !needsPassword) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] font-[Outfit]">
            <div className="text-center">
                 <Loader2 className="w-10 h-10 text-[#5B2D7D] animate-spin mx-auto mb-4" />
                 <p className="text-[#5B2D7D] font-medium animate-pulse">{status}</p>
            </div>
        </div>
      );
  }

  if (needsPassword && ownerInfo) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] font-[Outfit] p-4">
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50">
                <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-6 h-6 text-[#5B2D7D]" />
                </div>
                
                <h2 className="text-xl font-bold text-[#5B2D7D] text-center mb-2">First Time Access</h2>
                <p className="text-[#5B2D7D]/60 text-center text-sm mb-6">
                    Please verify ownership for <br/>
                    <span className="font-semibold text-[#5B2D7D]">{maskEmail(ownerInfo.email)}</span>
                </p>

                <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B2D7D]/40" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 pl-10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-[#5B2D7D] hover:bg-[#4A246A] text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-[#5B2D7D]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Login"}
                        {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>
                
                <p className="text-[10px] text-center text-[#5B2D7D]/40 mt-6">
                    This verification happens only once per device.
                </p>
            </div>
        </div>
      );
  }

  // Fallback / Error State
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] font-[Outfit]">
      <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Zap className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Access Denied</h2>
        <p className="text-[#5B2D7D]/60">{status}</p>
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
