"use client";

import { useEffect, useState } from "react";
import { X, Share, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Android/Chrome/Brave/Edge)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner if not already standalone and not dismissed in this session
      const hasDismissed = sessionStorage.getItem("installBannerDismissed");
      if (!isStandaloneMode && !hasDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS, we show the banner manually if not standalone
    if (isIOSDevice && !isStandaloneMode) {
      const hasDismissed = sessionStorage.getItem("installBannerDismissed");
      if (!hasDismissed) {
        // Small delay to ensure user isn't immediately hit with a popup
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setIsVisible(false);
    sessionStorage.setItem("installBannerDismissed", "true");
  };

  if (!isVisible || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
      >
        <div className="bg-white/90 backdrop-blur-md border border-[#5B2D7D]/20 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#A4C538]/10 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
          
          <div className="w-12 h-12 bg-[#5B2D7D] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <img src="/Candyd_logo.svg" alt="Candyd" className="w-8 h-8 invert" />
          </div>

          <div className="flex-1">
            <h3 className="text-[#5B2D7D] font-bold text-sm leading-tight">Install Candyd NFC</h3>
            <p className="text-gray-600 text-[11px] leading-tight mt-0.5">
              {isIOS 
                ? "Tap Share then 'Add to Home Screen'" 
                : "Add to your home screen for the best experience"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isIOS ? (
              <button
                onClick={handleInstallClick}
                className="bg-[#5B2D7D] text-white text-[11px] font-bold px-4 py-2 rounded-full hover:bg-[#4a2466] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                Install
              </button>
            ) : (
                <div className="flex items-center justify-center bg-[#FDF2EC] p-2 rounded-full">
                    <Share className="w-4 h-4 text-[#5B2D7D]" />
                </div>
            )}
            
            <button
              onClick={() => {
                setIsVisible(false);
                sessionStorage.setItem("installBannerDismissed", "true");
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
