"use client";

import { createMemory } from "@/app/actions/memories";
import { deleteUploadedFile } from "@/app/actions/upload";
import { uploadMedia } from "@/lib/upload-client";
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
import Image from "@/components/media-image";

// --- Components ---

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy", "Excited", "Content", "Hopeful", "Anxious", "Calm", "Relieved", "Proud", "Loved", "Vulnerable", "Fulfilled", "Overwhelmed", "Missed"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet", "Warm", "Intimate", "Reflective", "Emotional", "Lighthearted", "Cozy", "Energetic", "Sentimental", "Playful", "Soft", "Meaningful", "Heavy"];

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
    const [isReordering, setIsReordering] = useState(false);

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
            const uploadPromise = uploadMedia(item.file);

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

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setMediaItems(prev => {
            const newList = [...prev];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            return newList;
        });
    };

    const handleMoveDown = (index: number) => {
        setMediaItems(prev => {
            if (index === prev.length - 1) return prev;
            const newList = [...prev];
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
            return newList;
        });
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
                const data = completedUploadsRef.current.get(item.id) || item.cloudData;
                if (!data) {
                    console.error("Missing cloud data for", item.id, item);
                    toast.error("Upload incomplete. Please try again.");
                    setIsUploading(false);
                    return;
                }
                finalUrls.push(data.url);
                finalTypes.push(data.type);
                finalSizes.push(data.size || 0);
            }

             const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date", date);
            formData.append("time", time);
            formData.append("location", location);
            formData.append("emotions", selectedEmotions.join(","));
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
                const charmId = selectedProductId || searchParams.get("charmId") || searchParams.get("productId");
                if (charmId) {
                  router.push(`/life-charm?charmId=${charmId}`);
                } else {
                  router.push("/life-charm");
                }
                router.refresh();
            }
            setIsUploading(false);
        });
    };

    const discardUploadsAndGoBack = async () => {
        await Promise.allSettled(
            Array.from(completedUploadsRef.current.values(), (data) => deleteUploadedFile(data.url))
        );
        router.back();
    };

    const hasMedia = mediaItems.length > 0;

    return (
        <div className="flex flex-col h-full bg-transparent  relative overflow-x-hidden">
             <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#F6F2EC] to-transparent z-10 pointer-events-none"></div>

             <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-12 overflow-x-hidden">
                <div className="max-w-xl mx-auto w-full relative z-20">
                    <button 
                        onClick={discardUploadsAndGoBack}
                        className="mb-6 p-2 -ml-2 text-[#556B5A] hover:bg-[#556B5A]/5 rounded-full transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back</span>
                    </button>

                    <div className="flex items-start justify-between mb-8 mt-2">
                         <div className="flex items-start gap-3">
                             <div className="mt-1">
                                <Feather className="w-7 h-7 text-[#556B5A]" />
                             </div>
                            <div>
                                <h1 className="text-[28px] font-black text-[#556B5A] uppercase leading-[0.9] tracking-tight">PRESERVE YOUR<br/> MEMORY</h1>
                                <p className="text-[#A69D93] text-[11px] mt-2 leading-relaxed max-w-[280px]">
                                    Add the memories your jewellery carries. Each one brings it to life.
                                </p>
                            </div>
                         </div>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        {/* Title */}
                        <div>
                            <label className="block text-[#C27A59] text-[13px] font-bold mb-2 uppercase">TITLE<span className="text-[#C27A59]">*</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value.slice(0, 15))}
                                placeholder="Name Your Memory"
                                className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px]"
                            />
                            <p className="text-[#A69D93] text-[10px] mt-1.5 ml-1">Character Limit : 15 Characters</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[#C27A59] text-[13px] font-bold mb-2 uppercase">DESCRIPTION</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the moment"
                                rows={2}
                                className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] resize-none"
                            />
                             <p className="text-[#A69D93] text-[10px] mt-1.5 ml-1">Character Limit : 2 lines</p>
                        </div>

                        {/* Media */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[#C27A59] text-[13px] font-bold uppercase">MEDIA<span className="text-[#C27A59]">*</span></label>
                                {mediaItems.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsReordering(!isReordering)}
                                        className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                                            isReordering 
                                            ? "bg-[#7C9A86] text-[#556B5A]" 
                                            : "bg-[#E6DED1] text-[#556B5A]"
                                        }`}
                                    >
                                        {isReordering ? (
                                            <>
                                                <RefreshCw className="w-3 h-3" /> Done
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3 h-3" /> Reorder
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            <p className="text-[#A69D93] text-[10px] mb-3 ml-1">You can add and edit the media later</p>
                            
                            {!hasMedia ? (
                                <div className="border border-dashed border-[#556B5A]/20 bg-[#F6F2EC] rounded-[32px] p-6 flex flex-col items-center justify-center text-center min-h-[250px] gap-4">
                                    <div>
                                        <button type="button" className="w-14 h-14 bg-[#F37B55] rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(243,123,85,0.3)] mx-auto relative z-10 transition-transform active:scale-95">
                                        <Upload className="w-8 h-8 text-white" />
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                        </button>
                                        <p className="text-[#556B5A] font-semibold text-[15px] mb-1">Upload your file or drag</p>
                                        <p className="text-[#A69D93] text-[10px]">Supported Format: SVG, JPG, PNG.....</p>
                                    </div>
                                    
                                    <div className="flex justify-center gap-3 w-full">
                                        <button type="button" onClick={() => imageInputRef.current?.click()} className="bg-[#E6DED1]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#556B5A] text-[11px] font-medium hover:bg-[#E6DED1] transition-colors">
                                            <ImageIcon className="w-4 h-4" /> Image
                                        </button>
                                        <button type="button" onClick={() => videoInputRef.current?.click()} className="bg-[#E6DED1]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#556B5A] text-[11px] font-medium hover:bg-[#E6DED1] transition-colors">
                                            <VideoIcon className="w-4 h-4" /> Video
                                        </button>
                                        <button type="button" onClick={() => audioInputRef.current?.click()} className="bg-[#E6DED1]/50 px-4 py-2 rounded-xl flex items-center gap-2 text-[#556B5A] text-[11px] font-medium hover:bg-[#E6DED1] transition-colors">
                                            <Mic className="w-4 h-4" /> Audio
                                        </button>
                                    </div>
                                    <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileChange} multiple accept="image/*" />
                                    <input type="file" ref={videoInputRef} className="hidden" onChange={handleFileChange} multiple accept="video/*" />
                                    <input type="file" ref={audioInputRef} className="hidden" onChange={handleFileChange} multiple accept="audio/*" />
                                </div>
                            ) : isReordering ? (
                                <div className="space-y-3">
                                    {mediaItems.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={false}
                                            className="relative overflow-hidden flex items-center h-28 rounded-xl ring-1 ring-[#E6DED1] bg-white p-0 overflow-hidden select-none transition-all"
                                        >
                                            {/* Move Up Button */}
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                                                disabled={index === 0}
                                                className="w-14 h-full flex items-center justify-center bg-[#7C9A86]/20 text-[#556B5A] disabled:opacity-10 disabled:bg-gray-100 hover:bg-[#7C9A86]/30 transition-colors active:scale-95 shrink-0"
                                            >
                                                <ChevronDown className="w-8 h-8 rotate-180" />
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 flex items-center gap-3 px-2 min-w-0 overflow-hidden">
                                                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden relative bg-[#F6F2EC]">
                                                    {item.file.type.startsWith("video") ? (
                                                        <video src={item.previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                                                    ) : (item.file.type.startsWith("audio") || item.type?.startsWith("audio")) ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-[#F6F2EC]">
                                                            <Mic className="w-8 h-8 text-[#556B5A]" />
                                                        </div>
                                                    ) : (
                                                        <Image src={item.previewUrl} alt="preview" fill className="object-cover" sizes="80px" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-[#556B5A] capitalize truncate">
                                                        {item.file.type.split('/')[0] || "Media"}
                                                    </p>
                                                    <p className="text-[10px] text-[#A69D93] truncate">
                                                        {index === 0 ? "Cover Media" : `Item ${index + 1}`}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.cloudData?.url) deleteUploadedFile(item.cloudData.url);
                                                    setMediaItems(prev => prev.filter(p => p.id !== item.id));
                                                }}
                                                className="w-14 h-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors active:scale-95 shrink-0"
                                            >
                                                <Trash2 className="w-6 h-6" />
                                            </button>

                                            {/* Move Down Button */}
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                                                disabled={index === mediaItems.length - 1}
                                                className="w-14 h-full flex items-center justify-center bg-[#556B5A]/10 text-[#556B5A] disabled:opacity-10 disabled:bg-gray-100 hover:bg-[#556B5A]/20 transition-colors active:scale-95 shrink-0"
                                            >
                                                <ChevronDown className="w-8 h-8" />
                                            </button>
                                        </motion.div>
                                    ))}
                                    
                                    <button 
                                        type="button"
                                        onClick={() => setIsReordering(false)}
                                        className="w-full bg-[#556B5A] text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                                    >
                                        Done Reordering
                                    </button>
                                </div>
                            ) : (
                                 <div className="bg-[#F6F2EC] rounded-2xl p-3 relative space-y-2 border border-[#E8D1E0]">
                                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                                        {mediaItems.map((item, i) => (
                                            <div key={item.id} className={`shrink-0 rounded-xl bg-gray-200 overflow-hidden relative border border-[#E8D1E0] group ${
                                                (item.file.type.startsWith("audio") || item.type?.startsWith("audio")) ? "w-64 h-24" : "w-24 h-24"
                                            }`}>
                                               {/* Preview */}
                                                {item.file.type.startsWith("video") ? (
                                                    <video src={item.previewUrl} className="w-full h-full object-cover" muted preload="metadata" />
                                                ) : (item.file.type.startsWith("audio") || item.type?.startsWith("audio")) ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-[#F6F2EC]">
                                                         <AudioPlayer src={item.previewUrl} className="w-full h-full bg-transparent! p-2!" />
                                                    </div>
                                                ) : (
                                                    <Image src={item.previewUrl} alt="preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
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
                                        <label className="shrink-0 w-24 h-24 rounded-xl border border-dashed border-[#556B5A]/30 flex flex-col items-center justify-center gap-1 cursor-pointer bg-white/50 hover:bg-white transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-[#F37B55] flex items-center justify-center shadow-sm">
                                                <Upload className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[9px] text-[#556B5A] font-medium">Add More</span>
                                            <input type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                                        </label>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[11px] text-[#A69D93] font-medium">
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
                                    className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 pl-12 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Calendar className="w-5 h-5 text-[#556B5A]" />
                                </div>
                             </div>
                        </div>
                        
                        {/* Time */}
                        <div>
                             <label className="block text-[#556B5A] text-[13px] font-bold mb-2">Time</label>
                             <div className="relative">
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 pl-12 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                                />
                                 <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Clock className="w-5 h-5 text-[#556B5A]" />
                                </div>
                             </div>
                        </div>

                        {/* Location */}
                        <div>
                             <label className="block text-[#556B5A] text-[13px] font-bold mb-2">Location</label>
                             <div className="relative">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Pick a location"
                                    className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 pl-12 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] font-medium"
                                />
                                 <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <MapPin className="w-5 h-5 text-[#556B5A]" />
                                </div>
                             </div>
                        </div>

                        {/* People */}
                        <div className="mb-6">
                            <label className="block text-[#556B5A] text-[13px] font-bold mb-1">People</label>
                            <p className="text-[#A69D93] text-[10px] mb-3">Who was there with you?</p>

                            <button
                                type="button"
                                onClick={() => setShowPeopleSelector(!showPeopleSelector)}
                                className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#556B5A]/40" />
                                    {selectedPeople.length > 0 ? (
                                        <span className="text-[#556B5A] text-[13px]">
                                            {selectedPeople
                                                .map((id) => people.find((p) => p.id === id)?.name)
                                                .filter(Boolean)
                                                .join(", ")}
                                        </span>
                                    ) : (
                                        <span className="text-[#556B5A]/30 text-[13px]">Select people</span>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`w-5 h-5 text-[#556B5A]/40 transition-transform ${
                                        showPeopleSelector ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {showPeopleSelector && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 p-3 bg-white rounded-xl border border-[#556B5A]/10 space-y-2 shadow-sm"
                                >
                                    {people.map((person) => (
                                        <button
                                            type="button"
                                            key={person.id}
                                            onClick={() => togglePerson(person.id)}
                                            className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                                                selectedPeople.includes(person.id)
                                                    ? "bg-[#556B5A] text-white"
                                                    : "hover:bg-[#E6DED1]/50 text-[#556B5A]"
                                            }`}
                                        >
                                            <span className="text-[13px] font-medium">{person.name}</span>
                                            {selectedPeople.includes(person.id) && (
                                                <span className="text-[11px]">✓</span>
                                            )}
                                        </button>
                                    ))}

                                    <div className="flex gap-2 pt-2 border-t border-[#556B5A]/10">
                                        <input
                                            type="text"
                                            value={newPersonName}
                                            onChange={(e) => setNewPersonName(e.target.value)}
                                            placeholder="Add someone new..."
                                            className="flex-1 px-3 py-2 rounded-lg bg-[#E6DED1]/30 text-[#556B5A] placeholder-[#556B5A]/30 outline-none text-[13px]"
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPerson())}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddPerson}
                                            disabled={!newPersonName.trim() || isAddingPerson}
                                            className="px-3 py-2 bg-[#556B5A] text-white rounded-lg text-[11px] font-bold disabled:opacity-50"
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
                            className="w-full bg-[#E6DED1] py-3.5 rounded-xl flex items-center justify-center gap-2 text-[#556B5A] font-bold text-[13px]"
                        >
                            Edit optional fields
                                <motion.div animate={{ rotate: optionalExpanded ? 180 : 0 }}>
                                    <ChevronDown className="w-5 h-5 text-[#556B5A]" />
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
                                        <label className="block text-[#556B5A] text-[13px] font-bold mb-1">How did you feel in the moment ?</label>
                                        <p className="text-[#A69D93] text-[10px] mb-3">What did you feel in that moment? Choose all that apply.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {EMOTIONS.map(emotion => (
                                                <button
                                                    type="button"
                                                    key={emotion}
                                                    onClick={() => toggleEmotion(emotion)}
                                                    className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                                        selectedEmotions.includes(emotion)
                                                        ? 'bg-[#556B5A] text-white border-[#556B5A]'
                                                        : 'bg-[#F6F2EC] text-[#556B5A] border-[#E6DED1] hover:bg-[#F2E6DE]'
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
                                                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border bg-[#556B5A] text-white border-[#556B5A] flex items-center gap-2"
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
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#F6F2EC] text-[#556B5A] border border-[#C27A59] outline-none min-w-[80px]"
                                                />
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowCustomEmotion(true)}
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#F6F2EC] text-[#A69D93] border border-[#E6DED1] flex items-center gap-1 hover:bg-[#F2E6DE]"
                                                >
                                                    Other <Plus className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mood */}
                                    <div>
                                        <label className="block text-[#556B5A] text-[13px] font-bold mb-1">Select a vibe that captures your memory</label>
                                        <p className="text-[#A69D93] text-[10px] mb-3">Pick a mood that fits the vibe of the memory best.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {MOODS.map(mood => (
                                                <button
                                                    type="button"
                                                    key={mood}
                                                    onClick={() => handleMoodSelect(mood)}
                                                    className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border ${
                                                        selectedMood === mood
                                                        ? 'bg-[#556B5A] text-white border-[#556B5A]'
                                                        : 'bg-[#F6F2EC] text-[#556B5A] border-[#E6DED1] hover:bg-[#F2E6DE]'
                                                    }`}
                                                >
                                                    {mood}
                                                </button>
                                            ))}
                                            
                                            {selectedMood && !MOODS.includes(selectedMood) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMood(null)}
                                                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors border bg-[#556B5A] text-white border-[#556B5A] flex items-center gap-2"
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
                                                    className="px-5 py-2.5 rounded-xl text-[13px] bg-[#F6F2EC] text-[#556B5A] border border-[#C27A59] outline-none min-w-[100px]"
                                                />
                                            ) : (
                                                !selectedMood || MOODS.includes(selectedMood) ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowCustomMood(true)}
                                                        className="px-5 py-2.5 rounded-xl text-[13px] bg-[#F6F2EC] text-[#A69D93] border border-[#E6DED1] flex items-center gap-1 hover:bg-[#F2E6DE]"
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
                                onClick={discardUploadsAndGoBack}
                                className="w-[56px] h-[56px] rounded-full bg-[#E6DED1] flex items-center justify-center shadow-lg text-[#556B5A] shrink-0 active:scale-95 transition-transform"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <button
                                type="button" 
                                onClick={handleSubmit} 
                                disabled={isPending || isUploading}
                                className="flex-1 bg-[#7C9A86] text-[#556B5A] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#95b330] transition-all disabled:opacity-70 active:scale-95"
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
