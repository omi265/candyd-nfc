"use client";

import { createMemory } from "@/app/actions/memories";
import { getCloudinarySignature, deleteUploadedFile } from "@/app/actions/upload";
import { getPeople, createPerson } from "@/app/actions/people";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, useRef, Suspense } from "react";
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
    Plus,
    X,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import AudioPlayer from "@/app/components/AudioPlayer";

// --- Components ---

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const EVENTS = ["Pre Wedding Celebrations", "Haldi", "Sangeet", "Mehendi", "Wedding"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

function MemoryUploadContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
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
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [customEventInput, setCustomEventInput] = useState("");
    const [showCustomEvent, setShowCustomEvent] = useState(false);
    
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
    const [customEmotionInput, setCustomEmotionInput] = useState("");
    const [showCustomEmotion, setShowCustomEmotion] = useState(false);

    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [customMoodInput, setCustomMoodInput] = useState("");
    const [showCustomMood, setShowCustomMood] = useState(false);

    // People State
    const [people, setPeople] = useState<any[]>([]);
    const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
    const [newPersonName, setNewPersonName] = useState("");
    const [showPeopleSelector, setShowPeopleSelector] = useState(false);
    const [isAddingPerson, setIsAddingPerson] = useState(false);

    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const uploadPromisesRef = useRef<Map<string, Promise<any>>>(new Map());
    const completedUploadsRef = useRef<Map<string, { url: string, type: string, size: number }>>(new Map());

    const [optionalExpanded, setOptionalExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>(searchParams.get("productId") || "");

    useEffect(() => {
        const pidFromUrl = searchParams.get("productId");
        if (pidFromUrl) {
            setSelectedProductId(pidFromUrl);
        }

        // Fetch people
        getPeople().then(setPeople);
    }, [searchParams]);

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
        type?: string; 
        status: 'pending' | 'uploading' | 'completed' | 'error';
        cloudData?: { url: string; type: string; size: number };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            const newItems: MediaItem[] = files.map(file => ({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: URL.createObjectURL(file),
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
                type: item.file.type.startsWith('audio') ? 'audio' : data.resource_type, 
                size: data.bytes 
            });

            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'completed', cloudData: { url: data.secure_url, type: item.file.type.startsWith('audio') ? 'audio' : data.resource_type, size: data.bytes } } 
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
    
    const addCustomEmotion = () => {
        if (customEmotionInput.trim()) {
            const val = customEmotionInput.trim();
            const formatted = val.charAt(0).toUpperCase() + val.slice(1);
            if (!selectedEmotions.includes(formatted)) {
                setSelectedEmotions(prev => [...prev, formatted]);
            }
            setCustomEmotionInput("");
            setShowCustomEmotion(false);
        } else {
             setShowCustomEmotion(false);
        }
    };

    const toggleEvent = (event: string) => {
        setSelectedEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
    };

    const addCustomEvent = () => {
        if (customEventInput.trim()) {
            const val = customEventInput.trim();
            const formatted = val.charAt(0).toUpperCase() + val.slice(1);
            if (!selectedEvents.includes(formatted)) {
                setSelectedEvents(prev => [...prev, formatted]);
            }
            setCustomEventInput("");
            setShowCustomEvent(false);
        } else {
            setShowCustomEvent(false);
        }
    };
    
    const handleMoodSelect = (mood: string) => {
        setSelectedMood(mood);
        setShowCustomMood(false);
        setCustomMoodInput("");
    }

    const addCustomMood = () => {
         if (customMoodInput.trim()) {
            const val = customMoodInput.trim();
            const formatted = val.charAt(0).toUpperCase() + val.slice(1);
            setSelectedMood(formatted);
            setCustomMoodInput("");
            setShowCustomMood(false);
        } else {
             setShowCustomMood(false);
        }
    }

    const handleAddPerson = async () => {
        if (!newPersonName.trim()) return;

        setIsAddingPerson(true);
        const result = await createPerson({ name: newPersonName.trim() });
        setIsAddingPerson(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.person) {
            setPeople([...people, result.person]);
            setSelectedPeople([...selectedPeople, result.person.id]);
            setNewPersonName("");
            toast.success(`Added ${result.person.name}`);
        }
    };

    const togglePerson = (personId: string) => {
        setSelectedPeople(prev => prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]);
    };

    const handleSubmit = async () => {
        setError(null);

        // Validation
        const missingFields = [];
        if (!title.trim()) missingFields.push("Title");
        if (!description.trim()) missingFields.push("Description");
        if (mediaItems.length === 0) missingFields.push("Media");
        if (!selectedProductId) missingFields.push("Charm Link");
        
        if (missingFields.length > 0) {
            toast.error(`Please fill in the following details: ${missingFields.join(", ")}`);
            return;
        }

        setIsUploading(true);

        try {
            const pendingUploads = mediaItems.filter(i => i.status === 'uploading' || i.status === 'pending');
            const failedUploads = mediaItems.filter(i => i.status === 'error');

            if (failedUploads.length > 0) {
                toast.error("Some files failed to upload. Please remove them or try again.");
                setIsUploading(false);
                return;
            }

            await Promise.all(pendingUploads.map(item => uploadPromisesRef.current.get(item.id)).filter(Boolean));
        } catch (err: any) {
            console.error("Wait for upload error", err);
            toast.error("Error finishing uploads");
            setIsUploading(false);
            return;
        }
        
        submitWithLatestData();
    };
    
    const mediaItemsRef = useRef<MediaItem[]>(mediaItems);
    useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

    const submitWithLatestData = async () => {
         const currentItems = mediaItemsRef.current;
         const pending = currentItems.filter(i => i.status === 'uploading');
         const failed = currentItems.filter(i => i.status === 'error');
         
         if (failed.length > 0) {
             toast.error("Some uploads failed. Please remove them.");
             setIsUploading(false);
             return;
         }

         if (pending.length > 0) {
             const pendingIds = pending.map(i => i.id);
             try {
                await Promise.all(pendingIds.map(id => uploadPromisesRef.current.get(id)));
             } catch (e) {
                 toast.error("Upload failed.");
                 setIsUploading(false);
                 return;
             }
         }
         
         processSubmission();
    }

    const processSubmission = () => {
        startTransition(async () => {
            const currentItems = mediaItemsRef.current;
            
            const finalUrls: string[] = [];
            const finalTypes: string[] = [];
            const finalSizes: number[] = [];
            
            for (const item of currentItems) {
                const data = completedUploadsRef.current.get(item.id);
                if (!data) {
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
            formData.append("events", selectedEvents.join(","));
            if (selectedMood) formData.append("mood", selectedMood);

            if (selectedPeople.length > 0) {
                formData.append("peopleIds", JSON.stringify(selectedPeople));
            }

            if (finalUrls.length > 0) {
                formData.append("mediaUrls", JSON.stringify(finalUrls));
                formData.append("mediaTypes", JSON.stringify(finalTypes));
                formData.append("mediaSizes", JSON.stringify(finalSizes));
            }

            if (selectedProductId) formData.append("productId", selectedProductId);
            const result = await createMemory(undefined, formData);

            if (result?.error) {
                setError(result.error);
                toast.error(result.error);
            } else if (result?.success) {
                toast.success("Memory created successfully!");
                router.back(); 
            }
            setIsUploading(false);
        });
    };

    const hasMedia = mediaItems.length > 0;

    return (
        <div className="flex flex-col h-full bg-[#FDF2EC] font-[Outfit] relative">
             <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#FDF2EC] to-transparent z-10 pointer-events-none"></div>

             <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-12">
                <div className="max-w-xl mx-auto w-full relative z-20">
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
                                className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px]"
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
                                className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] resize-none"
                            />
                             <p className="text-[#A68CAB] text-[10px] mt-1.5 ml-1">Describe you memory in a line or two</p>
                        </div>

                        {/* Media */}
                        <div>
                            <label className="block text-[#C27A59] text-[13px] font-bold mb-1">Media<span className="text-[#C27A59]">*</span></label>
                            <p className="text-[#A68CAB] text-[10px] mb-3 ml-1">You can add and edit media later.</p>
                            
                            {!hasMedia ? (
                                <div className="border border-dashed border-[#5B2D7D]/20 bg-[#FFF5F0] rounded-[32px] p-6 flex flex-col items-center justify-center text-center min-h-[250px] gap-4">
                                    <div>
                                        <button type="button" className="w-14 h-14 bg-[#F37B55] rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(243,123,85,0.3)] mx-auto relative z-10 transition-transform active:scale-95">
                                        <Upload className="w-8 h-8 text-white" />
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                        </button>
                                        <p className="text-[#5B2D7D] font-semibold text-[15px] mb-1">Upload your file or drag</p>
                                        <p className="text-[#A68CAB] text-[10px]">Supported Format: SVG, JPG, PNG.....</p>
                                    </div>
                                    
                                    <div className="flex justify-center gap-3 w-full">
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
                                            <div key={item.id} className={`shrink-0 rounded-xl bg-gray-200 overflow-hidden relative border border-[#E8D1E0] group ${
                                                (item.file.type.startsWith("audio") || item.type?.startsWith("audio")) ? "w-64 h-24" : "w-24 h-24"
                                            }`}>
                                               {/* Preview */}
                                                {item.file.type.startsWith("video") ? (
                                                    <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                                                ) : (item.file.type.startsWith("audio") || item.type?.startsWith("audio")) ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-[#FFF5F0]">
                                                         <AudioPlayer src={item.previewUrl} className="w-full h-full bg-transparent! p-2!" />
                                                    </div>
                                                ) : (
                                                    <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                                )}
                                                
                                                {/* Status Indicators */}
                                                {item.status === 'uploading' && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                                        <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                    </div>
                                                )}
                                                {item.status === 'error' && (
                                                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center z-10">
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
                                                    className="absolute top-1 right-1 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
                                    className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
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
                                    className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
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
                                    className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 pl-12 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                                />
                                 <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <MapPin className="w-5 h-5 text-[#5B2D7D]" />
                                </div>
                             </div>
                        </div>

                        {/* Events */}
                        <div className="mb-6">
                            <label className="block text-[#5B2D7D] text-[13px] font-bold mb-1">Event</label>
                            <p className="text-[#A68CAB] text-[10px] mb-3">Which event does this memory belong to?</p>
                            <div className="flex flex-wrap gap-2">
                                {EVENTS.map(event => (
                                    <button
                                        type="button"
                                        key={event}
                                        onClick={() => toggleEvent(event)}
                                        className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                            selectedEvents.includes(event)
                                            ? 'bg-[#5B2D7D] text-white border-[#5B2D7D]'
                                            : 'bg-[#FFF5F0] text-[#5B2D7D] border-[#FBE0D6] hover:bg-[#F8E9F0]'
                                        }`}
                                    >
                                        {event}
                                    </button>
                                ))}
                                
                                {selectedEvents.filter(e => !EVENTS.includes(e)).map(event => (
                                     <button
                                        type="button"
                                        key={event}
                                        onClick={() => toggleEvent(event)}
                                        className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border bg-[#5B2D7D] text-white border-[#5B2D7D] flex items-center gap-2"
                                    >
                                        {event}
                                        <X className="w-3 h-3 text-white/70" />
                                    </button>
                                ))}

                                {showCustomEvent ? (
                                    <input 
                                        type="text"
                                        autoFocus
                                        value={customEventInput}
                                        onChange={(e) => setCustomEventInput(e.target.value)}
                                        onBlur={addCustomEvent}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomEvent())}
                                        placeholder="Type event..."
                                        className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#5B2D7D] border border-[#C27A59] outline-none min-w-[100px]"
                                    />
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => setShowCustomEvent(true)}
                                        className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6] flex items-center gap-1 hover:bg-[#F8E9F0]"
                                    >
                                        Other <Plus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* People */}
                        <div className="mb-6">
                            <label className="block text-[#5B2D7D] text-[13px] font-bold mb-1">People</label>
                            <p className="text-[#A68CAB] text-[10px] mb-3">Who was there with you?</p>

                            <button
                                type="button"
                                onClick={() => setShowPeopleSelector(!showPeopleSelector)}
                                className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#5B2D7D]/40" />
                                    {selectedPeople.length > 0 ? (
                                        <span className="text-[#5B2D7D] text-[13px]">
                                            {selectedPeople
                                                .map((id) => people.find((p) => p.id === id)?.name)
                                                .filter(Boolean)
                                                .join(", ")}
                                        </span>
                                    ) : (
                                        <span className="text-[#5B2D7D]/30 text-[13px]">Select people</span>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`w-5 h-5 text-[#5B2D7D]/40 transition-transform ${
                                        showPeopleSelector ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {showPeopleSelector && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 p-3 bg-white rounded-xl border border-[#5B2D7D]/10 space-y-2 shadow-sm"
                                >
                                    {people.map((person) => (
                                        <button
                                            type="button"
                                            key={person.id}
                                            onClick={() => togglePerson(person.id)}
                                            className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                                                selectedPeople.includes(person.id)
                                                    ? "bg-[#5B2D7D] text-white"
                                                    : "hover:bg-[#EADDDE]/50 text-[#5B2D7D]"
                                            }`}
                                        >
                                            <span className="text-[13px] font-medium">{person.name}</span>
                                            {selectedPeople.includes(person.id) && (
                                                <span className="text-[11px]">✓</span>
                                            )}
                                        </button>
                                    ))}

                                    <div className="flex gap-2 pt-2 border-t border-[#5B2D7D]/10">
                                        <input
                                            type="text"
                                            value={newPersonName}
                                            onChange={(e) => setNewPersonName(e.target.value)}
                                            placeholder="Add someone new..."
                                            className="flex-1 px-3 py-2 rounded-lg bg-[#EADDDE]/30 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none text-[13px]"
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPerson())}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddPerson}
                                            disabled={!newPersonName.trim() || isAddingPerson}
                                            className="px-3 py-2 bg-[#5B2D7D] text-white rounded-lg text-[11px] font-bold disabled:opacity-50"
                                        >
                                            {isAddingPerson ? "..." : "Add"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
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
                                            
                                            {selectedEmotions.filter(e => !EMOTIONS.includes(e)).map(emotion => (
                                                <button
                                                    type="button"
                                                    key={emotion}
                                                    onClick={() => toggleEmotion(emotion)}
                                                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border bg-[#5B2D7D] text-white border-[#5B2D7D] flex items-center gap-2"
                                                >
                                                    {emotion}
                                                    <X className="w-3 h-3 text-white/70" />
                                                </button>
                                            ))}

                                            {showCustomEmotion ? (
                                                <input 
                                                    type="text"
                                                    autoFocus
                                                    value={customEmotionInput}
                                                    onChange={(e) => setCustomEmotionInput(e.target.value)}
                                                    onBlur={addCustomEmotion}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomEmotion())}
                                                    placeholder="Type..."
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#5B2D7D] border border-[#C27A59] outline-none min-w-[80px]"
                                                />
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowCustomEmotion(true)}
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6] flex items-center gap-1 hover:bg-[#F8E9F0]"
                                                >
                                                    Other <Plus className="w-3 h-3" />
                                                </button>
                                            )}
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
                                                    onClick={() => handleMoodSelect(mood)}
                                                    className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                                        selectedMood === mood
                                                        ? 'bg-[#5B2D7D] text-white border-[#5B2D7D]'
                                                        : 'bg-[#FFF5F0] text-[#5B2D7D] border-[#FBE0D6] hover:bg-[#F8E9F0]'
                                                    }`}
                                                >
                                                    {mood}
                                                </button>
                                            ))}
                                            
                                            {selectedMood && !MOODS.includes(selectedMood) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMood(null)}
                                                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border bg-[#5B2D7D] text-white border-[#5B2D7D] flex items-center gap-2"
                                                >
                                                    {selectedMood}
                                                    <X className="w-3 h-3 text-white/70" />
                                                </button>
                                            )}

                                            {showCustomMood ? (
                                                 <input 
                                                    type="text"
                                                    autoFocus
                                                    value={customMoodInput}
                                                    onChange={(e) => setCustomMoodInput(e.target.value)}
                                                    onBlur={addCustomMood}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomMood())}
                                                    placeholder="Type mood..."
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#5B2D7D] border border-[#C27A59] outline-none min-w-[100px]"
                                                />
                                            ) : (
                                                !selectedMood || MOODS.includes(selectedMood) ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowCustomMood(true)}
                                                        className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6] flex items-center gap-1 hover:bg-[#F8E9F0]"
                                                    >
                                                        Other <Plus className="w-3 h-3" />
                                                    </button>
                                                ) : null
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Action Buttons (Inline) */}
                        <div className="pt-4 flex items-center gap-3">
                             <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-[56px] h-[56px] rounded-full bg-[#EADDDE] flex items-center justify-center shadow-lg text-[#5B2D7D] shrink-0 active:scale-95 transition-transform"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <button
                                type="button" 
                                onClick={handleSubmit} 
                                disabled={isPending || isUploading}
                                className="flex-1 bg-[#A4C538] text-[#5B2D7D] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#95b330] transition-all disabled:opacity-70 active:scale-95"
                            >
                                 <span className="">{isUploading ? "Uploading media..." : isPending ? "Saving..." : "Create now"}</span>
                                 <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-6"></div>
                    </form>
                </div>
             </div>
        </div>
    );
}

export default function MemoryUploadPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MemoryUploadContent />
        </Suspense>
    );
}