"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsVisible(false), 700);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#5B2D7D] overflow-hidden"
        >
          {/* Ambient Background Pulse */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.1 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            className="absolute w-[800px] h-[800px] bg-white rounded-full blur-[150px] pointer-events-none"
          />

          {/* The Portrait Stamp */}
          <motion.div
            initial={{ scale: 4, opacity: 0, rotate: -35, y: -100 }}
            animate={{ scale: 1, opacity: 1, rotate: -2, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 15,
              mass: 1.5,
              delay: 0.1
            }}
            className="relative"
          >
            {/* Separate loop for breathing so it doesn't fight the entrance spring */}
            <motion.div
                animate={{ scale: [1, 1.015, 1], rotate: [0, 0.5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
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
                    <div className="absolute inset-[10px] bg-[#FDF2EC] flex flex-col items-center justify-center overflow-hidden">
                        
                        {/* Replicating the App's Gradient/Glow internally */}
                        <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-[#A4C538]/20 rounded-full blur-2xl" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-full h-full bg-[#5B2D7D]/15 rounded-full blur-2xl" />

                        {/* Inner Decorative Borders */}
                        <div className="absolute inset-3 border-2 border-[#5B2D7D]/5 rounded-sm" />

                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                             style={{ backgroundImage: 'url("/textures/paper-fibers.png")' }} />

                        {/* Stamp Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            <Image 
                                src="/Candyd_logo.svg" 
                                alt="Candyd" 
                                width={140} 
                                height={140} 
                                className="drop-shadow-sm grayscale-[0.2]"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Dynamic Drop Shadow for the "Impact" */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 0.25, scale: 1.1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-52 h-10 bg-black rounded-[100%] blur-2xl -z-10"
            />
          </motion.div>

          {/* Impact Feedback (Shockwave) */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{
              duration: 1,
              delay: 0.2,
              ease: "easeOut"
            }}
            className="absolute w-[180px] h-[180px] rounded-full border-[15px] border-white/30 pointer-events-none"
          />

          {/* Footer Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-16 flex flex-col items-center gap-3"
          >
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <motion.div 
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
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
