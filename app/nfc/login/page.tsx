"use client";

import { signIn } from "next-auth/react";
import { Zap, Lock, ArrowRight, Loader2, Camera, Heart, MapPin, Calendar, LayoutGrid } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { getProductWithType } from "@/app/actions/life-charm";
import { getProductOwnerInfo, completeUserSetup, getPublicMemoryCharmData } from "@/app/actions/nfc";
import CameraCapture from "@/app/components/CameraCapture";
import { AnimatePresence, motion } from "framer-motion";

function NFCLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState("Checking security...");
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [publicData, setPublicData] = useState<any>(null);
  const [showPublicGallery, setShowPublicGallery] = useState(false);

  const handleRedirect = useCallback(async (currentToken: string) => {
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
  }, []);

  // Helper to mask email
  const maskEmail = (email: string) => {
      const [name, domain] = email.split("@");
      if (!name || !domain) return email;
      const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : `${name}***`;
      return `${maskedName}@${domain}`;
  };

  const performTokenLogin = useCallback(async (tokenToUse: string) => {
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
  }, [handleRedirect]);



  useEffect(() => {
    if (!token) {
        // Handled in render now
      return;
    }

    // Haptic pulse on load
    if ("vibrate" in navigator) {
        navigator.vibrate([10, 30, 10]);
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
                // Device NOT trusted -> Fetch info
                setStatus("Verifying tag...");

                // Fetch public gallery data first
                const pubData = await getPublicMemoryCharmData(token);
                if (pubData && pubData.memories.length > 0) {
                    setPublicData(pubData);
                    setShowPublicGallery(true);
                }

                const info = await getProductOwnerInfo(token);
                
                if (info) {
                    setOwnerInfo(info);
                    if (info.setupRequired) {
                        setIsSetupMode(true);
                    } else {
                        setNeedsPassword(true);
                    }
                    setIsLoading(false);
                } else {
                    setStatus("Invalid tag.");
                    setIsLoading(false);
                }
            }
        } catch {
            setStatus("An error occurred.");
            setIsLoading(false);
        }
    };

    checkTrustAndLogin();
  }, [token, performTokenLogin]);

  const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;
      setIsLoading(true);
      setError("");

      try {
          const result = await completeUserSetup(token, newName, password);
          if (result.error) {
              setError(result.error);
              setIsLoading(false);
          } else {
              // Auto login using handlePasswordLogin
              await handlePasswordLogin(e);
          }
      } catch {
          setError("Setup failed.");
          setIsLoading(false);
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
      } catch {
          setError("Login failed. Please try again.");
          setIsLoading(false);
      }
  };

  const PublicGallery = () => {
    if (!publicData) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto px-4 pb-24"
        >
            <div className="text-center mb-8 pt-8">
                <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Heart className="w-8 h-8 text-[#5B2D7D] fill-[#5B2D7D]/10" />
                </div>
                <h1 className="text-2xl font-bold text-[#5B2D7D] mb-1">{publicData.name}</h1>
                <p className="text-[#5B2D7D]/60 text-sm">A collection of shared moments</p>
            </div>

            <div className="columns-2 md:columns-3 gap-4 space-y-4">
                {publicData.memories.map((memory: any) => (
                    <motion.div 
                        key={memory.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="break-inside-avoid bg-white/40 backdrop-blur-md rounded-[24px] overflow-hidden border border-white/50 shadow-sm"
                    >
                        {memory.media[0] && (
                            <div className="relative aspect-square overflow-hidden">
                                <img 
                                    src={memory.media[0].url} 
                                    alt={memory.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-3 right-3">
                                    <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm">
                                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="p-4">
                            <h3 className="text-[#5B2D7D] font-bold text-sm mb-1 line-clamp-1">{memory.title}</h3>
                            <div className="flex flex-col gap-1">
                                {memory.location && (
                                    <div className="flex items-center gap-1 text-[10px] text-[#5B2D7D]/50">
                                        <MapPin className="w-3 h-3" />
                                        <span className="line-clamp-1">{memory.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-[#5B2D7D]/50">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(memory.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[60]">
                <button 
                    onClick={() => setShowPublicGallery(false)}
                    className="bg-white/80 backdrop-blur-xl text-[#5B2D7D] px-6 py-3 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 border border-[#5B2D7D]/10 active:scale-95 transition-all"
                >
                    <Lock className="w-4 h-4" />
                    Manage Charm
                </button>
                <button 
                    onClick={() => setShowCamera(true)}
                    className="bg-[#A4C538] text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 active:scale-95 transition-all shadow-[#A4C538]/30"
                >
                    <Camera className="w-4 h-4" />
                    Snap Memory
                </button>
            </div>
        </motion.div>
    );
  };

  if (!token) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit]">
          <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Zap className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#5B2D7D] mb-2">Access Denied</h2>
            <p className="text-[#5B2D7D]/60">No token found. Please tap the tag again.</p>
          </div>
        </div>
      );
  }

  if (isLoading && !needsPassword && !isSetupMode) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit]">
            <div className="text-center">
                 <Loader2 className="w-10 h-10 text-[#5B2D7D] animate-spin mx-auto mb-4" />
                 <p className="text-[#5B2D7D] font-medium animate-pulse">{status}</p>
            </div>
        </div>
      );
  }

  if (showPublicGallery && publicData) {
    return (
        <div className="min-h-screen bg-transparent font-[Outfit] relative">
            <AnimatePresence>
                {showCamera && token && (
                    <CameraCapture 
                        token={token} 
                        onClose={() => setShowCamera(false)} 
                        onSuccess={() => setShowCamera(false)}
                    />
                )}
            </AnimatePresence>
            <PublicGallery />
        </div>
    );
  }

  if (isSetupMode && ownerInfo) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit] p-4">
            <AnimatePresence>
                {showCamera && token && (
                    <CameraCapture 
                        token={token} 
                        onClose={() => setShowCamera(false)} 
                        onSuccess={() => {
                            setShowCamera(false);
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden">
                {/* Quick Access Tab */}
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={() => setShowCamera(true)}
                        className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"
                    >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span>
                    </button>
                </div>

                <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-6 mt-4">
                    <Zap className="w-6 h-6 text-[#5B2D7D]" />
                </div>
                
                <h2 className="text-xl font-bold text-[#5B2D7D] text-center mb-2">Welcome!</h2>
                <p className="text-[#5B2D7D]/60 text-center text-sm mb-6">
                    Set up your account for <br/>
                    <span className="font-semibold text-[#5B2D7D]">{ownerInfo.email}</span>
                </p>

                <form onSubmit={handleSetup} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Your Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] placeholder-[#5B2D7D]/30 focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
                            placeholder="e.g. Alex"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Create Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B2D7D]/40" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 pl-10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
                                placeholder="Min. 6 characters"
                                required
                                minLength={6}
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
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}
                        {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  if (needsPassword && ownerInfo) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit] p-4">
            <AnimatePresence>
                {showCamera && token && (
                    <CameraCapture 
                        token={token} 
                        onClose={() => setShowCamera(false)} 
                        onSuccess={() => {
                            setShowCamera(false);
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden">
                {/* Quick Access Tab */}
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={() => setShowCamera(true)}
                        className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"
                    >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span>
                    </button>
                </div>

                <div className="w-12 h-12 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-6 mt-4">
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
    <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit]">
      <AnimatePresence>
          {showCamera && token && (
              <CameraCapture 
                  token={token} 
                  onClose={() => setShowCamera(false)} 
                  onSuccess={() => setShowCamera(false)}
              />
          )}
      </AnimatePresence>

      <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full text-center border border-white/50 relative overflow-hidden">
        {token && (
            <div className="absolute top-0 right-0">
                <button 
                    onClick={() => setShowCamera(true)}
                    className="bg-[#A4C538] text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2 hover:bg-[#93b132] transition-colors shadow-sm"
                >
                    <Camera className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span>
                </button>
            </div>
        )}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 mt-4">
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
