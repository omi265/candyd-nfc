"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  className?: string; // Allow external styling
}

export default function AudioPlayer({ src, className = "" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Generate random bar heights for a static "waveform" look
  // We'll use a fixed number of bars for the visual
  const [bars] = useState(() => Array.from({ length: 40 }, () => Math.floor(Math.random() * 60) + 20));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    
    const onError = (e: Event) => {
        console.error("Audio tag error:", audio.error, e);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
            await audioRef.current.play();
        } catch (error) {
            console.error("Audio Playback Error:", error);
        }
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div 
        className={`bg-[#FFF5F0] rounded-2xl p-4 flex items-center gap-4 cursor-pointer ${className}`}
        onClick={togglePlay}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      
      {/* Play/Pause Button */}
      <button 
        type="button"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-transparent shrink-0"
      >
        {isPlaying ? (
           <Pause className="w-5 h-5 text-[#5B2D7D] fill-current" />
        ) : (
           <Play className="w-5 h-5 text-[#5B2D7D] fill-current ml-1" />
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center gap-[2px] h-8 overflow-hidden mask-linear-gradient">
        {bars.map((height, i) => {
            // Determine if this bar is "played" based on progress
            const progress = (currentTime / duration) * 100;
            const barPos = (i / bars.length) * 100;
            const isPlayed = barPos < progress;

            return (
                <div
                    key={i}
                    className={`w-[3px] rounded-full transition-colors duration-200 ${
                        isPlayed ? "bg-[#5B2D7D]" : "bg-[#5B2D7D]/30"
                    }`}
                    style={{ 
                        height: `${height}%`,
                        // Animate height slightly when playing for "active" look
                        animation: isPlaying ? `pulse-height 1s infinite ${i * 0.05}s` : 'none'
                     }}
                />
            )
        })}
      </div>

       {/* Time Indicator (Optional, if space allows or desired) */}
       {/* <div className="text-[10px] text-[#A68CAB] font-medium shrink-0 w-8 text-right">
           {formatTime(currentTime)}
       </div> */}
       
       <style jsx>{`
         @keyframes pulse-height {
           0%, 100% { transform: scaleY(1); }
           50% { transform: scaleY(0.7); }
         }
       `}</style>
    </div>
  );
}
