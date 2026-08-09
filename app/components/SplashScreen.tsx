"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import Image from "next/image";

const MIN_SPLASH_MS = 900;

export default function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsVisible(false), MIN_SPLASH_MS);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.22, ease: "easeOut" } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#556B5A] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.12),transparent_38%)] pointer-events-none" />

          {/* The Portrait Stamp */}
          <motion.div
            initial={{ scale: 4, opacity: 0, rotate: -35, y: -100 }}
            animate={{ scale: 1, opacity: 1, rotate: -2, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 15,
              mass: 1.5,
              delay: 0.05
            }}
            className="relative"
          >
            <div>
                {/* Stamp Body with Serrated Edges */}
                <div className="relative w-56 h-80 flex items-center justify-center">
                    
                    {/* 1. The Perforated Border Layer */}
                    <div 
                        className="absolute inset-0 bg-[#FFFBF9] shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
                        style={{
                            maskImage: 'radial-gradient(circle at 12px 12px, transparent 8px, black 9px)',
                            maskSize: '24px 24px',
                            maskPosition: '-12px -12px',
                            WebkitMaskImage: 'radial-gradient(circle at 12px 12px, transparent 8px, black 9px)',
                            WebkitMaskSize: '24px 24px',
                            WebkitMaskPosition: '-12px -12px',
                        }}
                    />

                    {/* 2. The Solid Inner Body with App Gradient Background */}
                    <div className="absolute inset-[10px] bg-[#F6F2EC] flex flex-col items-center justify-center overflow-hidden">
                        
                        {/* Replicating the App's Gradient/Glow internally */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(124,154,134,0.3),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(85,107,90,0.2),transparent_38%)]" />

                        {/* Inner Decorative Borders */}
                        <div className="absolute inset-3 border-2 border-[#556B5A]/5 rounded-sm" />

                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                             style={{ backgroundImage: 'url("/textures/paper-fibers.png")' }} />

                        {/* Stamp Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            <Image 
                                src="/beige png.png" 
                                alt="Candyd" 
                                width={140} 
                                height={140} 
                                className="drop-shadow-sm grayscale-[0.2]"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Drop Shadow for the "Impact" */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-52 h-10 bg-black/25 rounded-[100%] -z-10" />
          </motion.div>

          {/* Footer Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ delay: 0.42, duration: 0.25 }}
            className="absolute bottom-16 flex flex-col items-center gap-3"
          >
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <div 
                        key={i}
                        className="w-1.5 h-1.5 bg-white rounded-full"
                    />
                ))}
            </div>
            <p className="text-white text-[9px] font-bold uppercase tracking-[0.4em]">
                Reliving Memories
            </p>
          </motion.div>
          
        </motion.div>
      )}
    </AnimatePresence>
  );
}
