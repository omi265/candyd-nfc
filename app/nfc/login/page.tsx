"use client";

import { signIn } from "next-auth/react";
import { Zap, Lock, ArrowRight, Loader2, Camera, Heart, MapPin, Calendar, Sparkles } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { getProductWithType } from "@/app/actions/life-charm";
import { getProductOwnerInfo, completeUserSetup, getPublicCharmShowcase, claimProduct } from "@/app/actions/nfc";
import CameraCapture from "@/app/components/CameraCapture";
import { AnimatePresence, motion } from "framer-motion";

function NFCLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState("Checking security...");
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isUnassigned, setIsUnassigned] = useState(false);
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
              default:
                  window.location.href = "/";
          }
      } else {
          window.location.href = "/";
      }
  }, []);

  // Helper to mask email
  const maskEmail = (email: string) => {
      if (!email) return "";
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
          localStorage.removeItem(`trusted_tag_${tokenToUse}`);
      } else {
          setStatus("Success! Redirecting...");
          await handleRedirect(tokenToUse);
      }
  }, [handleRedirect]);

  useEffect(() => {
    if (!token) return;

    if ("vibrate" in navigator) {
        navigator.vibrate([10, 30, 10]);
    }

    const checkTrustAndLogin = async () => {
        try {
            const isTrusted = localStorage.getItem(`trusted_tag_${token}`);

            if (isTrusted === "true") {
                setStatus("Authenticating...");
                await performTokenLogin(token);
            } else {
                setStatus("Verifying tag...");

                // 1. Fetch public gallery data (Showcase)
                const pubData = await getPublicCharmShowcase(token);
                if (pubData && pubData.items && pubData.items.length > 0) {
                    setPublicData(pubData);
                    setShowPublicGallery(true);
                }

                // 2. Fetch owner info
                const info = await getProductOwnerInfo(token);
                
                if (info) {
                    if (info && 'unassigned' in info) {
                        setIsUnassigned(true);
                        setOwnerInfo({ name: info.charmName || "New Charm", email: "" });
                    } else {
                        setOwnerInfo(info as any);
                        if (info.setupRequired) {
                            setIsSetupMode(true);
                        } else {
                            setNeedsPassword(true);
                        }
                    }
                    setIsLoading(false);
                } else {
                    setStatus("Invalid tag.");
                    setIsLoading(false);
                }
            }
        } catch (err) {
            console.error(err);
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
              await handlePasswordLogin(e);
          }
      } catch {
          setError("Setup failed.");
          setIsLoading(false);
      }
  };

  const handleClaim = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;
      setIsLoading(true);
      setError("");

      try {
          const result = await claimProduct(token, {
              email: newEmail,
              name: newName,
              password: password
          });

          if (result.error) {
              setError(result.error);
              setIsLoading(false);
          } else {
              localStorage.setItem(`trusted_tag_${token}`, "true");
              
              const loginResult = await signIn("credentials", {
                  email: newEmail,
                  password: password,
                  redirect: false
              });

              if (loginResult?.error) {
                  setError("Login failed after claim. Please log in manually.");
                  setIsLoading(false);
              } else {
                  setStatus("Claimed! Redirecting...");
                  await handleRedirect(token);
              }
          }
      } catch {
          setError("Claim process failed.");
          setIsLoading(false);
      }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      const emailToUse = ownerInfo?.email || newEmail;
      if (!emailToUse) return;

      try {
          const result = await signIn("credentials", {
              email: emailToUse,
              password: password,
              redirect: false
          });

          if (result?.error) {
              setError("Incorrect password.");
              setIsLoading(false);
          } else {
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
                {publicData.items.map((item: any) => (
                    <motion.div 
                        key={item.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="break-inside-avoid bg-white/40 backdrop-blur-md rounded-[24px] overflow-hidden border border-white/50 shadow-sm"
                    >
                        {item.media[0] && (
                            <div className="relative aspect-square overflow-hidden">
                                <img 
                                    src={item.media[0].url} 
                                    alt={item.title}
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
                            <h3 className="text-[#5B2D7D] font-bold text-sm mb-1 line-clamp-1">{item.title}</h3>
                            <div className="flex flex-col gap-1">
                                {item.location && (
                                    <div className="flex items-center gap-1 text-[10px] text-[#5B2D7D]/50">
                                        <MapPin className="w-3 h-3" />
                                        <span className="line-clamp-1">{item.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-[#5B2D7D]/50">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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

  if (isLoading && !needsPassword && !isSetupMode && !isUnassigned) {
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

  if (isUnassigned && ownerInfo) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-transparent font-[Outfit] p-4">
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[32px] shadow-lg max-w-sm w-full border border-white/50 relative overflow-hidden text-center">
                <div className="w-16 h-16 bg-[#A4C538]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-[#A4C538]" />
                </div>
                
                <h2 className="text-2xl font-bold text-[#5B2D7D] mb-2">Claim Your Charm</h2>
                <p className="text-[#5B2D7D]/60 text-sm mb-8 px-4">
                    This <span className="font-bold text-[#5B2D7D]">{ownerInfo.name}</span> is ready to be yours. Create an account to get started.
                </p>

                <form onSubmit={handleClaim} className="space-y-4 text-left">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Email Address</label>
                        <input 
                            type="email" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#5B2D7D] ml-1 uppercase tracking-wider">Full Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
                            placeholder="e.g. Alex Smith"
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
                                className="w-full bg-white/50 border border-[#5B2D7D]/10 rounded-xl px-4 py-3 pl-10 text-[#5B2D7D] focus:outline-none focus:ring-2 focus:ring-[#5B2D7D]/20 transition-all"
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
                        className="w-full bg-[#A4C538] hover:bg-[#93b132] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#A4C538]/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim & Start Living"}
                        {!isLoading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>
            </div>
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
