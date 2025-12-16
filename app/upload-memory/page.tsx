"use client";

import { createMemory, getUserProducts } from "@/app/actions/memories";
import { getCloudinarySignature } from "@/app/actions/upload";

// ... (icons remain the same, so imports are fine)
// Re-importing necessary hooks only to be safe with the replacement context
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";

import { 
    ChevronLeft, 
    Upload, 
    Calendar, 
    Clock, 
    MapPin, 
    Image as ImageIcon, 
    Video as VideoIcon, 
    Mic, 
    Trash2, 
    RefreshCw,
    Feather,
    ArrowRight,
    ChevronDown
} from "lucide-react";

// --- Components ---

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

export default function MemoryUploadPage() {
    const { user, isLoading } = useAuth(); // Keeping for frontend check, real auth is in server action
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [location, setLocation] = useState("");
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [media, setMedia] = useState<File[]>([]); 
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [optionalExpanded, setOptionalExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");

    useEffect(() => {
        getUserProducts().then(setProducts);
    }, []);

    // Initial check for auth
     useEffect(() => {
        if (!isLoading && !user) {
          router.push("/login");
        }
      }, [user, isLoading, router]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setMedia(files);
            
            // Create previews immediately
            const previews = files.map(file => URL.createObjectURL(file));
            setMediaPreviews(previews);
        }
    };

    const toggleEmotion = (emotion: string) => {
        setSelectedEmotions(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    };

    const handleSubmit = async () => {
        setError(null);
        setIsUploading(true);

        try {
            // 1. Upload Media First
            const uploadedUrls: string[] = [];
            const uploadedTypes: string[] = [];

            if (media.length > 0) {
                console.log("UPLOAD: Starting media upload for", media.length, "files");
                // Get signature once (or per file if safer/needed, but once is fine usually)
                const signatureData = await getCloudinarySignature();
                console.log("UPLOAD: Signature received", signatureData);
                const { signature, timestamp, folder, cloudName, apiKey } = signatureData;
                
                for (const file of media) {
                    console.log("UPLOAD: Uploading file", file.name);
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("api_key", apiKey!);
                    formData.append("timestamp", timestamp.toString());
                    formData.append("signature", signature);
                    formData.append("folder", folder);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        console.error("UPLOAD: Cloudinary error", err);
                        throw new Error(err.error?.message || "Upload failed");
                    }

                    const data = await response.json();
                    console.log("UPLOAD: Cloudinary success", data);
                    uploadedUrls.push(data.secure_url);
                    uploadedTypes.push(data.resource_type);
                }
            } else {
                console.log("UPLOAD: No media files selected");
            }

            // 2. Submit Memory with URLs
            startTransition(async () => {
                const formData = new FormData();
                formData.append("title", title);
                formData.append("description", description);
                formData.append("date", date);
                formData.append("time", time);
                formData.append("location", location);
                formData.append("emotions", selectedEmotions.join(","));
                if (selectedMood) formData.append("mood", selectedMood);
                if (selectedProductId) formData.append("productId", selectedProductId);
                
                // Pass URLs and Types as JSON strings
                if (uploadedUrls.length > 0) {
                    formData.append("mediaUrls", JSON.stringify(uploadedUrls));
                    formData.append("mediaTypes", JSON.stringify(uploadedTypes));
                }

                console.log("UPLOAD: Submitting to createMemory action with URLs", uploadedUrls);
                const result = await createMemory(undefined, formData);
                console.log("UPLOAD: createMemory result", result);

                if (result?.error) {
                    console.error("UPLOAD: createMemory error", result.error);
                    setError(result.error);
                } else if (result?.success) {
                    console.log("UPLOAD: Success, redirecting...");
                    router.push("/");
                }
                setIsUploading(false); // Reset uploading state
            });

        } catch (err: any) {
            console.error("Upload Error:", err);
            setError(err.message || "Failed to upload media.");
            setIsUploading(false);
        }
    };

    if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FDF2EC] text-[#5B2D7D]">Loading...</div>;

    const hasMedia = media.length > 0;

    return (
        <div className="flex flex-col h-full overflow-hidden relative font-[Outfit]">
            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-4 pt-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-8 mt-2">
                     <div className="flex items-start gap-3">
                         {/* Feather Icon */}
                         <div className="mt-1">
                            <Feather className="w-7 h-7 text-[#5B2D7D]" />
                         </div>
                        <div>
                            <h1 className="text-[28px] font-black text-[#5B2D7D] uppercase leading-[0.9] tracking-tight">LET'S SAVE<br/> A MEMORY</h1>
                            <p className="text-[#A68CAB] text-[11px] mt-2 leading-relaxed max-w-[280px]">
                                Tell us about one you'd like your jewelry to hold. The more you share, the more vivid the moment becomes.
                            </p>
                        </div>
                     </div>

                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    {/* Title */}
                    <div>
                        <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Title<span className="text-[#C27A59]">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 15))}
                            placeholder="Give a title to your memory"
                            className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px]"
                        />
                        <p className="text-[#A68CAB] text-[10px] mt-1.5 ml-1">Character limit : 15 letters</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Description<span className="text-[#C27A59]">*</span></label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your memory"
                            rows={2}
                            className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] resize-none"
                        />
                         <p className="text-[#A68CAB] text-[10px] mt-1.5 ml-1">Describe you memory in a line or two</p>
                    </div>

                    {/* Media */}
                    <div>
                        <label className="block text-[#C27A59] text-[13px] font-bold mb-1">Media<span className="text-[#C27A59]">*</span></label>
                        <p className="text-[#A68CAB] text-[10px] mb-3 ml-1">You can add and edit media later.</p>
                        
                        {!hasMedia ? (
                            <div className="border border-dashed border-[#5B2D7D]/20 bg-[#FFF5F0] rounded-[32px] p-6 relative flex flex-col items-center justify-center text-center h-52">
                                <button type="button" className="w-14 h-14 bg-[#F37B55] rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(243,123,85,0.3)] relative z-10 transition-transform active:scale-95">
                                   <Upload className="w-8 h-8 text-white" />
                                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                </button>
                                <p className="text-[#5B2D7D] font-semibold text-[15px] mb-1">Upload your file or drag</p>
                                <p className="text-[#A68CAB] text-[10px]">Supported Format: SVG, JPG, PNG.....</p>
                                
                                <div className="absolute bottom-5 left-5 right-5 flex justify-center gap-3">
                                     <div className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium">
                                        <ImageIcon className="w-4 h-4" /> Image
                                     </div>
                                     <div className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium">
                                        <VideoIcon className="w-4 h-4" /> Video
                                     </div>
                                     <div className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium">
                                        <Mic className="w-4 h-4" /> Audio
                                     </div>
                                </div>
                            </div>
                        ) : (
                             <div className="bg-[#FFF5F0] rounded-2xl p-3 relative space-y-2 border border-[#E8D1E0]">
                                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                                    {mediaPreviews.map((src, i) => (
                                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative border border-[#E8D1E0]">
                                           {/* Simple check for video extension or just show as img/video */}
                                            {media[i]?.type.startsWith("video") ? (
                                                <video src={src} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <img src={src} alt="preview" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    ))}
                                    <label className="flex-shrink-0 w-24 h-24 rounded-xl border border-dashed border-[#5B2D7D]/30 flex flex-col items-center justify-center gap-1 cursor-pointer bg-white/50 hover:bg-white transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#F37B55] flex items-center justify-center shadow-sm">
                                            <Upload className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[9px] text-[#5B2D7D] font-medium">Add More</span>
                                        <input type="file" className="hidden" onChange={(e) => {
                                             if (e.target.files && e.target.files.length > 0) {
                                                const newFiles = Array.from(e.target.files);
                                                setMedia(prev => [...prev, ...newFiles]);
                                                setMediaPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
                                             }
                                        }} multiple accept="image/*,video/*,audio/*" />
                                    </label>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[11px] text-[#A68CAB] font-medium">{media.length} file{media.length > 1 ? 's' : ''} selected</span>
                                    <button type="button" onClick={() => { setMedia([]); setMediaPreviews([]); }} className="text-[11px] text-[#C27A59] font-bold hover:underline">
                                        Clear all
                                    </button>
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                         <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Date<span className="text-[#C27A59]">*</span></label>
                         <div className="relative">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Calendar className="w-5 h-5 text-[#5B2D7D]" />
                            </div>
                         </div>
                    </div>
                    
                    {/* Time */}
                    <div>
                         <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Time</label>
                         <div className="relative">
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                            />
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Clock className="w-5 h-5 text-[#5B2D7D]" />
                            </div>
                         </div>
                    </div>

                    {/* Location */}
                    <div>
                         <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Location</label>
                         <div className="relative">
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Pick a location"
                                className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                            />
                             <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <MapPin className="w-5 h-5 text-[#5B2D7D]" />
                            </div>
                         </div>
                    </div>

                    {/* Charm Selector */}
                    <div className="mb-6">
                         <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Link to Charm (Optional)</label>
                         <div className="relative">
                            <select
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pr-10 text-[#5B2D7D] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium appearance-none"
                            >
                                <option value="">Select a charm...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronDown className="w-5 h-5 text-[#5B2D7D]" />
                            </div>
                         </div>
                    </div>

                    {/* Optional Fields Toggle */}
                    <button
                        type="button"
                        onClick={() => setOptionalExpanded(!optionalExpanded)}
                        className="w-full bg-[#EADDDE] py-3.5 rounded-xl flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-[13px]"
                    >
                        Edit optional fields
                            <motion.div animate={{ rotate: optionalExpanded ? 180 : 0 }}>
                                <ChevronDown className="w-5 h-5 text-[#5B2D7D]" />
                            </motion.div>
                    </button>

                    {/* Emotions & Mood - Collapsible */}
                    <AnimatePresence>
                        {optionalExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-6 pt-2"
                            >
                                {/* Emotions */}
                                <div>
                                    <label className="block text-[#5B2D7D] text-[13px] font-bold mb-1">Emotion(s) you felt</label>
                                    <p className="text-[#A68CAB] text-[10px] mb-3">What did you feel in that moment? Choose all that apply.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {EMOTIONS.map(emotion => (
                                            <button
                                                type="button"
                                                key={emotion}
                                                onClick={() => toggleEmotion(emotion)}
                                                className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                                    selectedEmotions.includes(emotion)
                                                    ? 'bg-[#5B2D7D] text-white border-[#5B2D7D]'
                                                    : 'bg-[#FFF5F0] text-[#5B2D7D] border-[#FBE0D6] hover:bg-[#F8E9F0]'
                                                }`}
                                            >
                                                {emotion}
                                            </button>
                                        ))}
                                        {/* Other Button style */}
                                        <div className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6]">
                                            Other
                                        </div>
                                    </div>
                                </div>

                                {/* Mood */}
                                <div>
                                    <label className="block text-[#5B2D7D] text-[13px] font-bold mb-1">Mood</label>
                                    <p className="text-[#A68CAB] text-[10px] mb-3">Pick a mood that fits the vibe of the memory best.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {MOODS.map(mood => (
                                            <button
                                                type="button"
                                                key={mood}
                                                onClick={() => setSelectedMood(mood)}
                                                className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                                    selectedMood === mood
                                                    ? 'bg-[#5B2D7D] text-white border-[#5B2D7D]'
                                                    : 'bg-[#FFF5F0] text-[#5B2D7D] border-[#FBE0D6] hover:bg-[#F8E9F0]'
                                                }`}
                                            >
                                                {mood}
                                            </button>
                                        ))}
                                        <div className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6]">
                                            Other
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Spacer for bottom bar */}
                    <div className="h-24"></div>
                </form>
            </main>
            
            {/* Sticky Bottom Bar */}
             <div className="absolute bottom-6 left-6 right-6 z-20 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-[56px] h-[56px] rounded-full bg-[#FFF5F0] flex items-center justify-center shadow-lg text-[#5B2D7D] flex-shrink-0 active:scale-95 transition-transform"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                    type="button" 
                    onClick={handleSubmit} 
                    disabled={isPending || isUploading}
                    className="flex-1 bg-[#D4C3D8] text-[#5B2D7D] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#C2ADC7] transition-all disabled:opacity-70 active:scale-95 relative"
                >
                     <span className="">{isUploading ? "Uploading media..." : isPending ? "Saving..." : "Create now"}</span>
                     <ArrowRight className="w-5 h-5" />
                </button>
             </div>
        </div>
    );
}
