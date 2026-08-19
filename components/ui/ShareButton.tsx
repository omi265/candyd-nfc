"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareButtonProps {
    token: string;
    charmName?: string;
    variant?: "icon" | "full";
}

export function ShareButton({ token, charmName, variant = "icon" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = "/nfc/login?token=";
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${baseUrl}${token}` : `${baseUrl}${token}`;

  const handleShare = async () => {
    const shareData = {
        title: `Our Dve Charm: ${charmName || 'My Charm'}`,
        text: `Check out this Our Dve Charm: ${charmName || 'My Charm'}`,
        url: fullUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
        } else {
            return; // User cancelled
        }
      }
    }

    // Fallback to copy if Share API fails or is unavailable
    handleCopy();
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fullUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) throw new Error("Fallback copy failed");
      }

      toast.success("Link copied to clipboard!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Could not copy automatically. Link: " + fullUrl);
    }
  };

  if (variant === "full") {
    return (
        <button
            onClick={handleShare}
            className="w-full bg-[#EAE0F0] text-[#556B5A] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
            {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            <span>{copied ? "Copied!" : "Share Charm Link"}</span>
        </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="p-2 hover:bg-[#E6DED1] rounded-full transition-colors text-[#556B5A]"
      title="Share Link"
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
    </button>
  );
}
