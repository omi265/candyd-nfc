"use client";

import { motion } from "framer-motion";
import { haptics } from "@/lib/haptics";

export function HapticDebug() {
    return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap justify-center gap-2 px-4 pointer-events-none w-full">
            {[
                { label: "Light", action: haptics.light },
                { label: "Medium", action: haptics.medium },
                { label: "Heavy", action: haptics.heavy },
                { label: "Success", action: haptics.success },
                { label: "3 Ticks", action: haptics.nfcTap },
            ].map((btn) => (
                <button
                    key={btn.label}
                    onClick={(e) => { e.stopPropagation(); btn.action(); }}
                    className="px-3 py-1.5 bg-[#556B5A]/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-black rounded-full pointer-events-auto active:scale-95 transition-all shadow-xl"
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
}
