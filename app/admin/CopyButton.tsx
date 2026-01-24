"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const baseUrl = "/nfc/login?token=";
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${baseUrl}${token}` : `${baseUrl}${token}`;

  const handleCopy = async () => {
    try {
      // Modern Clipboard API (Requires Secure Context / HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        // Fallback for non-secure contexts (HTTP over network IP)
        const textArea = document.createElement("textarea");
        textArea.value = fullUrl;
        
        // Ensure the textarea is not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error("Fallback copy failed");
        }
      }

      console.log("Copied Link:", fullUrl);
      toast.success("Link copied to clipboard!");
      toast.info(`Link: ${fullUrl}`); 
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Could not copy automatically. Link: " + fullUrl);
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
