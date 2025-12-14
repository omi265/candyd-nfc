"use client";

import { createMemory } from "@/app/actions/memories";

// ... (icons remain the same, so imports are fine)
// Re-importing necessary hooks only to be safe with the replacement context
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";

// --- Icons (reused/adapted) ---

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UploadIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white">
            <path d="M9 17V11L7 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 11L11 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#5B2D7D]">
            <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function ClockIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#5B2D7D]">
             <path d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M15.71 15.18L12.61 13.33C12.07 13.01 11.63 12.24 11.63 11.61V7.51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}

function LocationIcon() {
     return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#5B2D7D]">
            <path d="M12 13.43C13.7231 13.43 15.12 12.0331 15.12 10.31C15.12 8.58687 13.7231 7.19 12 7.19C10.2769 7.19 8.88 8.58687 8.88 10.31C8.88 12.0331 10.2769 13.43 12 13.43Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.62 8.49C5.59 -0.169998 18.42 -0.159997 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39 20.54C5.63 17.88 2.47 13.57 3.62 8.49Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
     )
}

function ImageIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/><polyline points="21 15 16 10 5 21" strokeWidth="2"/></svg>; }
function VideoIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="23 7 16 12 23 17 23 7" strokeWidth="2"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeWidth="2"/></svg>; }
function AudioIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeWidth="2"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="2"/><line x1="12" y1="19" x2="12" y2="23" strokeWidth="2"/><line x1="8" y1="23" x2="16" y2="23" strokeWidth="2"/></svg>; }
function TrashIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6" strokeWidth="2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2"/></svg>; }
function RefreshIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v6h-6" strokeWidth="2"/><path d="M1 20v-6h6" strokeWidth="2"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeWidth="2"/></svg>}

// --- Components ---

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

export default function MemoryUploadPage() {
    const { user, isLoading } = useAuth(); // Keeping for frontend check, real auth is in server action
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("17-06-2025");
    const [time, setTime] = useState("12:09:93");
    const [location, setLocation] = useState("");
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [media, setMedia] = useState<File[]>([]); // simplified for demo
    const [optionalExpanded, setOptionalExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial check for auth
     useEffect(() => {
        if (!isLoading && !user) {
          router.push("/login");
        }
      }, [user, isLoading, router]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setMedia(Array.from(e.target.files));
        }
    };

    const toggleEmotion = (emotion: string) => {
        setSelectedEmotions(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    };

    const handleSubmit = async () => {
        setError(null);
        startTransition(async () => {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date", date);
            formData.append("time", time);
            formData.append("location", location);
            formData.append("emotions", selectedEmotions.join(","));
            if (selectedMood) formData.append("mood", selectedMood);
            
            // Media is skipped for now as per instructions

            const result = await createMemory(undefined, formData);
            if (result?.error) {
                setError(result.error);
            } else if (result?.success) {
                router.push("/");
            }
        });
    };

    if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>;

    const hasMedia = media.length > 0;

    return (
        <div className="flex flex-col flex-1 pb-8">
            <main className="px-6 flex-1">
                {/* Hero */}
                <div className="flex items-start gap-2 mb-6 mt-2">
                     {/* Placeholder for the blue feather/leaf icon */}
                     <span className="text-3xl">🪶</span> 
                    <div>
                        <h1 className="text-2xl font-bold text-[#5B2D7D] uppercase leading-tight font-[Outfit]">LET'S SAVE A MEMORY</h1>
                        <p className="text-[#A68CAB] text-xs mt-1 leading-relaxed">
                            Tell us about one you'd like your jewelry to hold. The more you share, the more vivid the moment becomes.
                        </p>
                    </div>
                </div>

                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    {/* Title */}
                    <div>
                        <label className="block text-[#C27A59] text-sm font-semibold mb-1">Title<span className="text-[#C27A59]">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 15))}
                            placeholder="Give a title to your memory"
                            className="w-full bg-[#FFF5F0] border-none rounded-lg p-3 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-sm"
                        />
                        <p className="text-[#A68CAB] text-[10px] mt-1 text-right">Character limit : 15 letters</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[#C27A59] text-sm font-semibold mb-1">Description<span className="text-[#C27A59]">*</span></label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your memory"
                            rows={3}
                            className="w-full bg-[#FFF5F0] border-none rounded-lg p-3 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-sm resize-none"
                        />
                         <p className="text-[#A68CAB] text-[10px] mt-1">Describe you memory in a line or two</p>
                    </div>

                    {/* Media */}
                    <div>
                        <label className="block text-[#C27A59] text-sm font-semibold mb-1">Media<span className="text-[#C27A59]">*</span></label>
                        <p className="text-[#A68CAB] text-[10px] mb-2">You can add and edit media later.</p>
                        
                        {!hasMedia ? (
                            <div className="border border-dashed border-[#E8D1E0] bg-[#FFF5F0] rounded-2xl p-6 relative flex flex-col items-center justify-center text-center h-48">
                                <button type="button" className="w-12 h-12 bg-[#F37B55] rounded-xl flex items-center justify-center mb-3 shadow-md relative z-10">
                                   <UploadIcon />
                                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                </button>
                                <p className="text-[#5B2D7D] font-medium text-sm">Upload your file or drag.</p>
                                <p className="text-[#A68CAB] text-[10px] mt-1">Supported Format : SVG, JPG, PNG.....</p>
                                
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2">
                                     <div className="bg-[#F8E9F0] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#5B2D7D] text-xs">
                                        <ImageIcon /> Image
                                     </div>
                                     <div className="bg-[#F8E9F0] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#5B2D7D] text-xs">
                                        <VideoIcon /> Video
                                     </div>
                                     <div className="bg-[#F8E9F0] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#5B2D7D] text-xs">
                                        <AudioIcon /> Audio
                                     </div>
                                </div>
                            </div>
                        ) : (
                             <div className="bg-[#FFF5F0] rounded-2xl p-3 relative space-y-2 border border-[#E8D1E0]">
                                <div className="relative rounded-xl overflow-hidden h-40 group">
                                    <img src="/placeholder-memory.jpg" alt="Memory" className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                     </div>
                                     {/* Mock buttons over image */}
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 backdrop-blur-md p-1 rounded">
                                        <div className="w-4 h-0.5 bg-white mb-1"></div>
                                        <div className="w-4 h-0.5 bg-white"></div>
                                    </div>
                                    <button type="button" className="absolute bottom-2 left-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white">
                                        <RefreshIcon />
                                    </button>
                                     <button type="button" className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs" onClick={() => router.push('/')}>
                                        <BackIcon /> <span className="ml-1">Back to home</span>
                                     </button>
                                </div>
                                <div className="relative rounded-xl overflow-hidden h-24">
                                     <img src="/placeholder-memory-2.jpg" alt="Memory 2" className="w-full h-full object-cover" />
                                      <button type="button" className="absolute bottom-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-lg text-[#F37B55]">
                                        <TrashIcon />
                                    </button>
                                     <button type="button" className="absolute bottom-2 left-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white">
                                        <RefreshIcon />
                                    </button>
                                </div>
                                
                                <div className="flex justify-between gap-2 mt-2">
                                     <div className="bg-[#E8D1E0] px-4 py-2 rounded-xl flex-1 flex items-center justify-center gap-2 text-[#5B2D7D] text-xs font-semibold">
                                        <ImageIcon /> Image
                                     </div>
                                     <div className="bg-[#F8E9F0] px-4 py-2 rounded-xl flex-1 flex items-center justify-center gap-2 text-[#5B2D7D] text-xs opacity-60">
                                        <VideoIcon /> Video
                                     </div>
                                     <div className="bg-[#F8E9F0] px-4 py-2 rounded-xl flex-1 flex items-center justify-center gap-2 text-[#5B2D7D] text-xs opacity-60">
                                        <AudioIcon /> Audio
                                     </div>
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                         <label className="block text-[#C27A59] text-sm font-semibold mb-1">Date<span className="text-[#C27A59]">*</span></label>
                         <div className="relative">
                            <input
                                type="text"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#FFF5F0] border-none rounded-lg p-3 pl-10 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <CalendarIcon />
                            </div>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A68CAB] text-xs font-normal">(today)</span>
                         </div>
                    </div>
                    
                    {/* Time */}
                    <div>
                         <label className="block text-[#5B2D7D] text-sm font-normal mb-1">Time</label>
                         <div className="relative">
                            <input
                                type="text"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-[#FFF5F0] border-none rounded-lg p-3 pl-10 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-sm"
                            />
                             <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <ClockIcon />
                            </div>
                         </div>
                    </div>

                    {/* Location */}
                    <div>
                         <label className="block text-[#5B2D7D] text-sm font-normal mb-1">Location</label>
                         <div className="relative">
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Pick a location"
                                className="w-full bg-[#FFF5F0] border-none rounded-lg p-3 pl-10 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-sm"
                            />
                             <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <LocationIcon />
                            </div>
                         </div>
                    </div>

                    {/* Optional Fields Toggle */}
                    {!optionalExpanded && (
                         <button
                            type="button"
                            onClick={() => setOptionalExpanded(true)}
                            className="w-full bg-[#EADDDE] py-3 rounded-xl flex items-center justify-center gap-2 text-[#5B2D7D] font-medium text-sm"
                        >
                            Edit optional fields
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.9201 8.95001L13.4001 15.47C12.6301 16.24 11.3701 16.24 10.6001 15.47L4.08008 8.95001" stroke="#5B2D7D" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}

                    {/* Emotions & Mood - Collapsible */}
                    <AnimatePresence>
                        {optionalExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-5"
                            >
                                {/* Emotions */}
                                <div>
                                    <label className="block text-[#5B2D7D] text-sm font-semibold mb-1">Emotion(s) you felt</label>
                                    <p className="text-[#A68CAB] text-[10px] mb-3">What did you feel in that moment? Choose all that apply.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {EMOTIONS.map(emotion => (
                                            <button
                                                type="button"
                                                key={emotion}
                                                onClick={() => toggleEmotion(emotion)}
                                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                                    selectedEmotions.includes(emotion)
                                                    ? 'bg-[#5B2D7D] text-white'
                                                    : 'bg-[#FFF5F0] text-[#5B2D7D] hover:bg-[#F8E9F0]'
                                                }`}
                                            >
                                                {emotion}
                                            </button>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder="Other"
                                            className="px-4 py-2 rounded-lg text-sm bg-[#FFF5F0] text-[#5B2D7D] placeholder-[#D8C4D0] outline-none max-w-[100px]"
                                        />
                                    </div>
                                </div>

                                {/* Mood */}
                                <div>
                                    <label className="block text-[#5B2D7D] text-sm font-semibold mb-1">Mood</label>
                                    <p className="text-[#A68CAB] text-[10px] mb-3">Pick a mood that fits the vibe of the memory best.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {MOODS.map(mood => (
                                            <button
                                                type="button"
                                                key={mood}
                                                onClick={() => setSelectedMood(mood)}
                                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                                    selectedMood === mood
                                                    ? 'bg-[#5B2D7D] text-white'
                                                    : 'bg-[#FFF5F0] text-[#5B2D7D] hover:bg-[#F8E9F0]'
                                                }`}
                                            >
                                                {mood}
                                            </button>
                                        ))}
                                         <input
                                            type="text"
                                            placeholder="Other"
                                            className="w-full px-4 py-2 rounded-lg text-sm bg-[#FFF5F0] text-[#5B2D7D] placeholder-[#D8C4D0] outline-none"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Message */}
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-[#D4C3D8] text-[#5B2D7D] text-sm font-semibold py-4 rounded-full flex items-center justify-center gap-2 mt-8 hover:bg-[#C2ADC7] transition-colors disabled:opacity-50"
                    >
                        {isPending ? "Saving..." : "Create now"} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.4301 5.92993L20.5001 11.9999L14.4301 18.0699" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 12H20.33" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                     <div className="h-4"></div>
                </form>
            </main>
        </div>
    );
}
