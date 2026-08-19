"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, X, Check, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createGuestMemory } from "@/app/actions/nfc";
import { uploadMedia } from "@/lib/upload-client";
import { haptics } from "@/lib/haptics";

interface CameraCaptureProps {
  token: string;
  onClose: () => void;
  onSuccess: (memoryId: string) => void;
}

export default function CameraCapture({ token, onClose, onSuccess }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setIsCameraReady(false);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Check if browser supports mediaDevices (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("MediaDevices API not available");
      toast.error("Camera access requires HTTPS or localhost. If you are using an IP address, please use HTTPS.");
      return;
    }

    try {
      // Try with preferred facingMode
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 1280, max: 1920 },
          },
          audio: false,
        });
      } catch (e) {
        console.warn("Preferred camera failed, trying any video device...");
        // Fallback to any video device
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsCameraReady(true);
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const error = err instanceof Error ? err : null;
      const errorMsg = error?.name === "NotAllowedError" 
        ? "Camera permission denied. Please enable it in your browser settings."
        : `Camera error: ${error?.message || "Unknown error"}`;
      toast.error(errorMsg);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (capturedImage) URL.revokeObjectURL(capturedImage);
    };
  }, [capturedImage]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    // Vibrate on capture
    haptics.medium();

    const sourceWidth = videoRef.current.videoWidth;
    const sourceHeight = videoRef.current.videoHeight;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.round(sourceWidth * scale);
    const targetHeight = Math.round(sourceHeight * scale);

    canvasRef.current.width = targetWidth;
    canvasRef.current.height = targetHeight;
    context.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);

    canvasRef.current.toBlob((blob) => {
      if (!blob) {
        toast.error("Could not capture photo");
        return;
      }

      setCapturedBlob(blob);
      setCapturedImage(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    }, "image/jpeg", 0.82);
    
    // Stop stream to save battery
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRetake = () => {
    setCapturedImage(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedBlob(null);
    startCamera();
  };

  const handleUpload = async () => {
    if (!capturedBlob) return;

    setIsUploading(true);
    haptics.light();

    try {
      const file = new File([capturedBlob], "quick-capture.jpg", { type: "image/jpeg" });
      const uploadResult = await uploadMedia(file, { guestToken: token });

      // Create Guest Memory in Database
      const dbResult = await createGuestMemory(token, {
        title: "Quick Capture",
        mediaUrl: uploadResult.secure_url,
        mediaType: "image",
        mediaSize: uploadResult.bytes,
      });

      if (dbResult.error) throw new Error(dbResult.error);

      haptics.success();
      toast.success("Memory captured!");
      onSuccess(dbResult.memoryId!);
    } catch (err: unknown) {
      haptics.error();
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setIsUploading(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
    haptics.light();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between font-[Outfit]"
    >
      {/* Header */}
      <div className="w-full p-6 flex justify-between items-center z-10">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-white backdrop-blur-md">
          <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Quick Capture</span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            
            {/* Guide Overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[2px] border-white/20 m-12 rounded-3xl" />
                <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10" />
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/10" />
            </div>
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="w-full p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center gap-8">
        <AnimatePresence mode="wait">
          {!capturedImage ? (
            <motion.div 
              key="capture-controls"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="flex items-center justify-around w-full max-w-xs"
            >
              <button 
                onClick={toggleCamera}
                className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="w-6 h-6" />
              </button>

              <button
                onClick={takePhoto}
                disabled={!isCameraReady}
                className="w-20 h-20 rounded-full border-4 border-white p-1 bg-transparent group active:scale-95 transition-transform"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:bg-white/90" />
              </button>

              <div className="w-14" /> {/* Spacer */}
            </motion.div>
          ) : (
            <motion.div 
              key="upload-controls"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="flex flex-col items-center gap-6 w-full px-6"
            >
              <div className="flex items-center gap-8">
                <button
                  onClick={handleRetake}
                  disabled={isUploading}
                  className="p-5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all flex flex-col items-center gap-1"
                >
                  <RefreshCw className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
                </button>

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-24 h-24 bg-[#556B5A] rounded-full text-white flex items-center justify-center shadow-2xl shadow-[#556B5A]/50 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : (
                    <Check className="w-10 h-10" />
                  )}
                </button>
              </div>
              
              {!isUploading && (
                <p className="text-white/60 text-xs font-medium text-center bg-white/5 py-2 px-4 rounded-full backdrop-blur-sm">
                  This will be added to your Our Dve Charm instantly
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
