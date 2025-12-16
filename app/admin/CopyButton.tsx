"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const link = `${window.location.origin}/nfc/login?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        p-1.5 rounded-lg transition-all duration-200
        ${copied 
          ? "bg-[#A4C538] text-white" 
          : "bg-white/50 text-[#5B2D7D] hover:bg-[#5B2D7D] hover:text-white"
        }
      `}
      title="Copy Link"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
