"use client";

import { createMemory, getUserProducts } from "@/app/actions/memories";
import { getCloudinarySignature, deleteUploadedFile } from "@/app/actions/upload";

// ... (icons remain the same, so imports are fine)
// Re-importing necessary hooks only to be safe with the replacement context
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useRef } from "react";
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
    ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// --- Components ---

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

export default function MemoryUploadPage() {
    const { user, isLoading } = useAuth(); // Keeping for frontend check, real auth is in server action
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [location, setLocation] = useState("");
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const uploadPromisesRef = useRef<Map<string, Promise<any>>>(new Map());
    const completedUploadsRef = useRef<Map<string, { url: string, type: string, size: number }>>(new Map());

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

    type MediaItem = {
        id: string;
        file: File;
        previewUrl: string;
        status: 'pending' | 'uploading' | 'completed' | 'error';
        cloudData?: { url: string; type: string; size: number };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            const newItems: MediaItem[] = files.map(file => ({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: URL.createObjectURL(file), // Note: Make sure to revoke these covers eventually if needed, though browsers handle it reasonably well for page lifetime
                status: 'uploading',
            }));

            setMediaItems(prev => [...prev, ...newItems]);

            // Start uploads immediately
            newItems.forEach(item => {
                uploadFile(item);
            });
        }
    };

    const uploadFile = async (item: MediaItem) => {
        try {
            // Store promise in ref to await later if needed
            const uploadPromise = (async () => {
                const signatureData = await getCloudinarySignature();
                const { signature, timestamp, folder, cloudName, apiKey } = signatureData;

                const formData = new FormData();
                formData.append("file", item.file);
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
                    throw new Error(err.error?.message || "Upload failed");
                }

                return await response.json();
            })();

            uploadPromisesRef.current.set(item.id, uploadPromise);

            const data = await uploadPromise;

            completedUploadsRef.current.set(item.id, { 
                url: data.secure_url, 
                type: data.resource_type, 
                size: data.bytes 
            });

            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'completed', cloudData: { url: data.secure_url, type: data.resource_type, size: data.bytes } } 
                : i
            ));
        } catch (error) {
            console.error("Upload failed for", item.file.name, error);
            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'error' } 
                : i
            ));
            toast.error(`Failed to upload ${item.file.name}`);
        } finally {
            uploadPromisesRef.current.delete(item.id);
        }
    };

    const toggleEmotion = (emotion: string) => {
        setSelectedEmotions(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    };

    const handleSubmit = async () => {
        setError(null);

        // Validation
        const missingFields = [];
        if (!title.trim()) missingFields.push("Title");
        if (!description.trim()) missingFields.push("Description");
        if (mediaItems.length === 0) missingFields.push("Media");
        
        if (missingFields.length > 0) {
            toast.error(`Please fill in the following details: ${missingFields.join(", ")}`);
            return;
        }

        setIsUploading(true); // Using this for general "Saving..." state now

        try {
            // Check for pending uploads
            const pendingUploads = mediaItems.filter(i => i.status === 'uploading' || i.status === 'pending');
            const failedUploads = mediaItems.filter(i => i.status === 'error');

            if (failedUploads.length > 0) {
                // Retry failed? Or just block?
                // For now, block and ask user to remove or retry (we need a retry button really, but let's just ask to remove for MVP speed)
                toast.error("Some files failed to upload. Please remove them or try again.");
                setIsUploading(false);
                return;
            }

            if (pendingUploads.length > 0) {
               // toast.loading("Finishing uploads..."); // 'sonner' toast.loading returns an ID if we want to dismiss, but here we just wait
               // Actually better to just show it in the button text or a separate indicator
            }

            // Wait for all current uploads to finish
            // We can use the values in uploadPromisesRef
            await Promise.all(pendingUploads.map(item => uploadPromisesRef.current.get(item.id)).filter(Boolean));

            // Re-read mediaItems to get the final URLs?
            // Wait, state updates might not have flushed if we are in the same closure event...
            // Actually, we need to rely on the *data* we just got or refetch state?
            // 'mediaItems' here is closed over. 
            // We can trust that since we awaited the promises, the side-effects (setting state) are queued, 
            // BUT in this closure 'mediaItems' is STALE.
            // However, we don't strictly need 'mediaItems' state if we knew the results. 
            // But we don't have the results easily here without state.
            
            // CORRECT APPROACH in React 18+ with async handler:
            // The state won't update mid-function.
            // We can use a functional state update to inspect the latest, OR use a ref to track the items data.
            // Let's use a Ref to track the *latest* mediaItems as well, or just rely on the fact that 
            // we can wait for the promises and then... wait, how do we get the data?
            // The promises function returns the data! 
            
            // Let's re-gather the data.
            // We know existing completed items have cloudData.
            // The ones we just awaited returned data.
            // But mixing them is tricky.
            
            // Alternative: Use a Ref for `mediaItemsRef` that is always kept in sync with state, 
            // so we can read the latest values here.
        } catch (err: any) {
            console.error("Wait for upload error", err);
            toast.error("Error finishing uploads");
            setIsUploading(false);
            return;
        }
        
        // We need to access the LATEST items. 
        // Let's use a function to get the actual data to submit.
        // We can't access updated state here easily.
        // Let's change the strategy slightly: 
        // We will construct the final arrays by checking if we have cloudData in current state (already done) 
        // OR by using the result of the promise we just awaited.
        
        // But simpler: just use a ref to hold the items data for submission reading.
        submitWithLatestData();
    };
    
    // We need a ref to access latest media items inside the async handleSubmit
    const mediaItemsRef = useRef<MediaItem[]>(mediaItems);
    useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

    const submitWithLatestData = async () => {
         // Final check using REF
         const currentItems = mediaItemsRef.current;
         const pending = currentItems.filter(i => i.status === 'uploading');
         const failed = currentItems.filter(i => i.status === 'error');
         
         if (failed.length > 0) {
             toast.error("Some uploads failed. Please remove them.");
             setIsUploading(false);
             return;
         }

         if (pending.length > 0) {
             // We still have pending items? 
             // If we just awaited them in the previous block... wait, I split the logic.
             // Let's merge it:
             
             // 1. Identify which IDs are pending
             const pendingIds = pending.map(i => i.id);
             
             // 2. Wait for their specific promises
             try {
                await Promise.all(pendingIds.map(id => uploadPromisesRef.current.get(id)));
             } catch (e) {
                 toast.error("Upload failed.");
                 setIsUploading(false);
                 return;
             }
         }
         
         // 3. NOW check ref again, they should be completed (because the promise resolution splits state update)
         // Wait, React state updates are batched/async. Even after await, the re-render might not have happened 
         // on the javascript thread before we continue? 
         // Actually, if we await a promise, the microtask queue clears. The state setter was called. 
         // But the component function hasn't re-run to update `mediaItemsRef`.
         // So `mediaItemsRef.current` MIGHT BE STALE if we rely on useEffect to update it.
         
         // Fix: create a dedicated `completedUploads` Map ref that stores the data directly 
         // as soon as it's available, independent of React state. 
         // Use that for submission.
         
         processSubmission();
    }

    

    // Update uploadFile to write to this ref
    // (See uploadFile modification below in the full code)

    const processSubmission = () => {
        startTransition(async () => {
            // Get all items from state (just to preserve order and know which ones we want)
            // But we can't trust state for the *cloudData* if it just finished.
            // We trust `completedUploadsRef` for the data.
            
            const currentItems = mediaItemsRef.current; // access via ref to get somewhat recent, but we mostly care about IDs order
            
            const finalUrls: string[] = [];
            const finalTypes: string[] = [];
            const finalSizes: number[] = [];
            
            for (const item of currentItems) {
                const data = completedUploadsRef.current.get(item.id);
                if (!data) {
                    // Start of function check usually catches this, but concurrent race...
                    console.error("Missing cloud data for", item.id);
                    toast.error("Upload incomplete. Please try again.");
                    setIsUploading(false);
                    return;
                }
                finalUrls.push(data.url);
                finalTypes.push(data.type);
                finalSizes.push(data.size);
            }

             const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date", date);
            formData.append("time", time);
            formData.append("location", location);
            formData.append("emotions", selectedEmotions.join(","));
            if (selectedMood) formData.append("mood", selectedMood);
            if (selectedProductId) formData.append("productId", selectedProductId);
            
            if (finalUrls.length > 0) {
                formData.append("mediaUrls", JSON.stringify(finalUrls));
                formData.append("mediaTypes", JSON.stringify(finalTypes));
                formData.append("mediaSizes", JSON.stringify(finalSizes));
            }

            console.log("UPLOAD: Submitting to createMemory action with URLs", finalUrls);
            const result = await createMemory(undefined, formData);

            if (result?.error) {
                setError(result.error);
                toast.error(result.error);
            } else if (result?.success) {
                toast.success("Memory created successfully!");
                router.push("/");
            }
            setIsUploading(false);
        });
    };
    
    // ... inside component ...

    const hasMedia = mediaItems.length > 0;

    return (
        <div className="flex flex-col h-full overflow-hidden relative font-[Outfit]">
            {/* ... Header ... */} 
             <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-4 pt-4">
                <div className="flex items-start justify-between mb-8 mt-2">
                     <div className="flex items-start gap-3">
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
                                     <button type="button" onClick={() => imageInputRef.current?.click()} className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium hover:bg-[#EADDDE] transition-colors">
                                        <ImageIcon className="w-4 h-4" /> Image
                                     </button>
                                     <button type="button" onClick={() => videoInputRef.current?.click()} className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium hover:bg-[#EADDDE] transition-colors">
                                        <VideoIcon className="w-4 h-4" /> Video
                                     </button>
                                     <button type="button" onClick={() => audioInputRef.current?.click()} className="bg-[#EADDDE]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#5B2D7D] text-[11px] font-medium hover:bg-[#EADDDE] transition-colors">
                                        <Mic className="w-4 h-4" /> Audio
                                     </button>
                                </div>
                                <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileChange} multiple accept="image/*" />
                                <input type="file" ref={videoInputRef} className="hidden" onChange={handleFileChange} multiple accept="video/*" />
                                <input type="file" ref={audioInputRef} className="hidden" onChange={handleFileChange} multiple accept="audio/*" />
                            </div>
                        ) : (
                             <div className="bg-[#FFF5F0] rounded-2xl p-3 relative space-y-2 border border-[#E8D1E0]">
                                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                                    {mediaItems.map((item, i) => (
                                        <div key={item.id} className="shrink-0 w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative border border-[#E8D1E0] group">
                                           {/* Preview */}
                                            {item.file.type.startsWith("video") ? (
                                                <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                            )}
                                            
                                            {/* Status Indicators */}
                                            {item.status === 'uploading' && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                </div>
                                            )}
                                            {item.status === 'error' && (
                                                <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                                                    <Trash2 className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            
                                            {/* Remove Button */}
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    if (item.cloudData?.url) {
                                                        deleteUploadedFile(item.cloudData.url);
                                                    }
                                                    setMediaItems(prev => prev.filter(p => p.id !== item.id));
                                                    uploadPromisesRef.current.delete(item.id);
                                                    completedUploadsRef.current.delete(item.id);
                                                }}
                                                className="absolute top-1 right-1 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="shrink-0 w-24 h-24 rounded-xl border border-dashed border-[#5B2D7D]/30 flex flex-col items-center justify-center gap-1 cursor-pointer bg-white/50 hover:bg-white transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#F37B55] flex items-center justify-center shadow-sm">
                                            <Upload className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[9px] text-[#5B2D7D] font-medium">Add More</span>
                                        <input type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                    </label>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[11px] text-[#A68CAB] font-medium">
                                        {mediaItems.length} file{mediaItems.length > 1 ? 's' : ''} selected
                                        {mediaItems.some(i => i.status === 'uploading') && <span className="text-[#C27A59] ml-2 animate-pulse">Uploading...</span>}
                                    </span>
                                    <button type="button" onClick={() => { 
                                        // Cleanup all completed uploads
                                        completedUploadsRef.current.forEach((data) => {
                                            if (data.url) deleteUploadedFile(data.url);
                                        });
                                        setMediaItems([]); 
                                        uploadPromisesRef.current.clear(); 
                                        completedUploadsRef.current.clear(); 
                                    }} className="text-[11px] text-[#C27A59] font-bold hover:underline">
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
                    className="w-[56px] h-[56px] rounded-full bg-[#FFF5F0] flex items-center justify-center shadow-lg text-[#5B2D7D] shrink-0 active:scale-95 transition-transform"
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
