"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const baseUrl = "/nfc/login?token=";
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${baseUrl}${token}` : `${baseUrl}${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 hover:bg-[#F0E6F5] rounded-full transition-colors text-[#5B2D7D]"
      title="Copy Link"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
