"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, X, Check, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getGuestCloudinarySignature, createGuestMemory } from "@/app/actions/nfc";
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
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setIsCameraReady(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      toast.error("Camera access denied. Please check permissions.");
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

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    // Vibrate on capture
    haptics.medium();

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    
    // Stop stream to save battery
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    haptics.light();

    try {
      // 1. Get Guest Signature
      const sigData = await getGuestCloudinarySignature(token);
      if (!sigData) throw new Error("Could not get upload signature");

      // 2. Prepare Form Data for Cloudinary
      const formData = new FormData();
      formData.append("file", capturedImage);
      formData.append("api_key", sigData.apiKey!);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);
      formData.append("type", sigData.type!);

      // 3. Upload to Cloudinary
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error?.message || "Upload failed");

      // 4. Create Guest Memory in Database
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
    } catch (err: any) {
      haptics.error();
      toast.error(err.message || "Something went wrong");
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
                  className="w-24 h-24 bg-[#5B2D7D] rounded-full text-white flex items-center justify-center shadow-2xl shadow-[#5B2D7D]/50 active:scale-95 transition-transform disabled:opacity-50"
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
                  This will be added to your Candyd Charm instantly
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
