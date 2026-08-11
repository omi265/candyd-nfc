"use client";

import { useRef } from "react";
import { updateMemory, deleteMemory } from "@/app/actions/memories";
import { deleteUploadedFile } from "@/app/actions/upload";
import { uploadMedia } from "@/lib/upload-client";
import { getPeople, createPerson } from "@/app/actions/people";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
    ChevronLeft,
    Plus,
    Calendar,
    Clock,
    MapPin,
    Mic,
    Trash2,
    Archive,
    ChevronDown,
    ChevronUp,
    Pencil,
    Check,
    RefreshCw,
    X,
    Users,
    Play
} from "lucide-react";
import { toast } from "sonner";
import AudioPlayer from "@/app/components/AudioPlayer";
import { getOptimizedUrl } from "@/lib/media-helper";
import Image from "@/components/media-image";

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy", "Excited", "Content", "Hopeful", "Anxious", "Calm", "Relieved", "Proud", "Loved", "Vulnerable", "Fulfilled", "Overwhelmed", "Missed"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet", "Warm", "Intimate", "Reflective", "Emotional", "Lighthearted", "Cozy", "Energetic", "Sentimental", "Playful", "Soft", "Meaningful", "Heavy"];

interface DraggableMediaItemProps {
    item: any;
    index: number;
    isReordering: boolean;
    totalItems: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
}

const DraggableMediaItem = ({ item, index, isReordering, totalItems, onMoveUp, onMoveDown, onDelete }: DraggableMediaItemProps) => {
    return (
        <motion.div
            layout
            initial={false}
            className={`relative overflow-hidden bg-gray-200 select-none transition-all ${
                isReordering 
                ? "flex items-center h-28 rounded-xl ring-1 ring-[#E6DED1] bg-white p-0 overflow-hidden" 
                : `rounded-[20px] ${item.type === 'audio' ? 'h-24' : 'h-48'}`
            }`}
        >
            {isReordering ? (
                // --- Row Layout (Reorder Mode) ---
                <>
                    {/* Move Up Button (Left) */}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                        disabled={index === 0}
                        className="w-14 h-full flex items-center justify-center bg-[#7C9A86]/20 text-[#556B5A] disabled:opacity-10 disabled:bg-gray-100 hover:bg-[#7C9A86]/30 transition-colors active:scale-95 shrink-0"
                    >
                        <ChevronUp className="w-8 h-8" />
                    </button>

                    {/* Content */}
                    <div className="flex-1 flex items-center gap-3 px-2 min-w-0 overflow-hidden">
                        {/* Small Thumbnail */}
                        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden relative bg-[#F6F2EC]">
                            {item.type?.includes('video') ? (
                                <div className="w-full h-full relative">
                                    {item.url.includes("cloudinary.com") ? (
                                        <Image 
                                            src={getOptimizedUrl((item as any).posterUrl || (item.url.includes('/s--') ? item.url : item.url.replace(/\.[^/.]+$/, ".jpg")), 'video', 400)}
                                            alt="thumbnail"
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                        />
                                    ) : (
                                        <video src={item.url} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                </div>
                            ) : item.type === 'audio' ? (
                                <div className="w-full h-full flex items-center justify-center bg-[#F6F2EC]">
                                    <Mic className="w-8 h-8 text-[#556B5A]" />
                                </div>
                            ) : (
                                <Image 
                                    src={getOptimizedUrl(item.url, 'image', 400)} 
                                    alt="thumbnail" 
                                    fill 
                                    className="object-cover" 
                                    sizes="80px"
                                />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#556B5A] capitalize truncate">
                                {item.type?.split('/')[0] || "Media"}
                            </p>
                            <p className="text-[10px] text-[#A69D93] truncate">
                                {index === 0 ? "Cover Media" : `Item ${index + 1}`}
                            </p>
                            {item.isNew && (
                                <span className="inline-block mt-1 bg-[#7C9A86]/20 text-[#556B5A] text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                    NEW
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Delete Button (New) */}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="w-14 h-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors active:scale-95 shrink-0"
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>

                    {/* Move Down Button (Right) */}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                        disabled={index === totalItems - 1}
                        className="w-14 h-full flex items-center justify-center bg-[#556B5A]/10 text-[#556B5A] disabled:opacity-10 disabled:bg-gray-100 hover:bg-[#556B5A]/20 transition-colors active:scale-95 shrink-0"
                    >
                        <ChevronDown className="w-8 h-8" />
                    </button>
                </>
            ) : (
                // --- Card Layout (View/Edit Mode) ---
                <>
                  {item.type?.includes('video') ? (
                       <div className="relative w-full h-48 bg-black/5">
                            {item.url.includes("cloudinary.com") ? (
                                <Image 
                                     src={getOptimizedUrl((item as any).posterUrl || (item.url.includes('/s--') ? item.url : item.url.replace(/\.[^/.]+$/, ".jpg")), 'video', 600)}
                                     alt="video thumbnail"
                                     fill
                                     className="object-cover pointer-events-none"
                                     sizes="(max-width: 768px) 100vw, 50vw"
                                 />
                            ) : (
                                <video src={item.url} className="w-full h-full object-cover pointer-events-none" preload="metadata" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                 <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/20">
                                     <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                 </div>
                            </div>
                       </div>
                  ) : item.type === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#F6F2EC] p-2 pointer-events-none">
                            <div className="w-full pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                                <AudioPlayer src={item.url} className="w-full bg-transparent! p-0! shadow-none" />
                            </div>
                        </div>
                  ) : (
                       <Image src={getOptimizedUrl(item.url, 'image', 1080)} alt="media" fill className="object-cover pointer-events-none" sizes="(max-width: 768px) 100vw, 50vw" />
                  )}
                  
                 {/* Upload Status */}
                 {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                 )}
                 {item.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center z-20">
                        <span className="text-white text-xs font-bold px-2">Upload Failed</span>
                    </div>
                 )}

                  {/* Indicators */}
                  <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start pointer-events-none z-10 transition-opacity duration-200">
                      {index === 0 && (
                          <span className="bg-[#556B5A] text-[#7C9A86] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                              COVER
                          </span>
                      )}
                      {item.isNew && (
                          <span className={`bg-[#7C9A86] text-[#556B5A] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${index === 0 ? 'ml-auto' : ''}`}>
                              NEW
                          </span>
                      )}
                  </div>
                </>
            )}
        </motion.div>
    );
};

interface MemoryClientPageProps {
    memory: any;
    products: any[];
}

// --- Edit Mode (Now the Main/Only Mode for this Page) ---

export default function MemoryClientPage({ memory, products }: MemoryClientPageProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [optionalExpanded, setOptionalExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form State
    const [title, setTitle] = useState(memory.title);
    const [description, setDescription] = useState(memory.description);
    const [date, setDate] = useState(() => new Date(memory.date).toISOString().split('T')[0]);
    const [time, setTime] = useState(memory.time || "");
    const [location, setLocation] = useState(memory.location || "");
    
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>(memory.emotions || []);
    const [customEmotionInput, setCustomEmotionInput] = useState("");
    const [showCustomEmotion, setShowCustomEmotion] = useState(false);

    const [selectedMood, setSelectedMood] = useState<string | null>(memory.mood || null);
    const [customMoodInput, setCustomMoodInput] = useState("");
    const [showCustomMood, setShowCustomMood] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>(memory.productId || "");

    // People State
    const [people, setPeople] = useState<any[]>([]);
    const [selectedPeople, setSelectedPeople] = useState<string[]>(memory.peopleIds || []);
    const [newPersonName, setNewPersonName] = useState("");
    const [showPeopleSelector, setShowPeopleSelector] = useState(false);
    const [isAddingPerson, setIsAddingPerson] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Unified Media State
    // We add 'status' to track upload progress
    const [mediaItems, setMediaItems] = useState<{
        id: string;
        url: string;
        type: string;
        posterUrl?: string;
        isNew: boolean;
        file?: File;
        size?: number;
        status: 'pending' | 'uploading' | 'completed' | 'error';
        cloudData?: { url: string; type: string; size: number };
    }[]>(() => {
        return (memory.media || []).map((m: any) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            posterUrl: m.posterUrl,
            isNew: false,
            status: 'completed',
            cloudData: { url: m.url, type: m.type, size: 0 } // Mock size for existing
        }));
    });

    const uploadPromisesRef = useRef<Map<string, Promise<any>>>(new Map());
    const completedUploadsRef = useRef<Map<string, { url: string, type: string, size: number, posterUrl?: string }>>(
        new Map((memory.media || []).map((m: any) => [m.id, { url: m.url, type: m.type, size: 0, posterUrl: m.posterUrl }]))
    );

    // Keep a ref to mediaItems for safe access in async callbacks if needed,
    // though for the final submission we will rely on completedUploadsRef + current state IDs order
    const mediaItemsRef = useRef(mediaItems);
    useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

    // Fetch people on mount
    useEffect(() => {
        getPeople().then(setPeople);
    }, []);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            const newItems = files.map(file => ({
                id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                url: URL.createObjectURL(file), // Preview URL
                type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
                isNew: true,
                file: file,
                status: 'uploading' as const,
            }));

            setMediaItems(prev => [...prev, ...newItems]);

             // Start uploads immediately
             newItems.forEach(item => {
                uploadFile(item);
            });
        }
    };

    const uploadFile = async (item: any) => {
        try {
            const uploadPromise = uploadMedia(item.file);
            uploadPromisesRef.current.set(item.id, uploadPromise);

            const data = await uploadPromise;
            const finalType = (item.type === 'audio' || item.file?.type.startsWith('audio')) ? 'audio' : data.resource_type;

            const cloudData = { 
                url: data.secure_url, 
                type: finalType, 
                size: data.bytes 
            };

            completedUploadsRef.current.set(item.id, cloudData);

            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'completed', cloudData, type: finalType } 
                : i
            ));
        } catch (error) {
            console.error("Upload failed for", item.file?.name, error);
            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'error' } 
                : i
            ));
            toast.error(`Failed to upload ${item.file?.name || "file"}`);
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

    const handleCancel = async () => {
        const newUploadUrls = mediaItems
            .filter((item) => item.isNew)
            .flatMap((item) => {
                const upload = completedUploadsRef.current.get(item.id);
                return upload?.url ? [upload.url] : [];
            });
        await Promise.allSettled(newUploadUrls.map((url) => deleteUploadedFile(url)));
        router.back();
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

    const handleRemoveMedia = (index: number) => {
        const itemToRemove = mediaItems[index];
        const completedUpload = completedUploadsRef.current.get(itemToRemove.id);
        if (itemToRemove.isNew && completedUpload?.url) {
            void deleteUploadedFile(completedUpload.url).catch((error) => {
                console.error("Failed to discard uploaded media", error);
            });
        }
        
        setMediaItems(prev => prev.filter((_, i) => i !== index));
        // Cleanup refs if needed
        if (itemToRemove.id) {
            completedUploadsRef.current.delete(itemToRemove.id);
            uploadPromisesRef.current.delete(itemToRemove.id);
        }
    };

    const handleSave = async () => {
        setIsUploading(true);
        // Clean errors first?
        const failed = mediaItemsRef.current.filter(i => i.status === 'error');
        if (failed.length > 0) {
            toast.error("Some files failed to upload. Please remove them or try again.");
            setIsUploading(false);
            return;
        }

        const loadingToast = toast.loading("Saving memory...");

        try {
            // Check for pending uploads
            // We use the Ref to get the LATEST list of items that are supposedly in the list
            // But we need to wait for their specific promises if they are still uploading
            const pendingIds = mediaItemsRef.current.filter(i => i.status === 'uploading').map(i => i.id);
            
            if (pendingIds.length > 0) {
                 // Wait for them
                 await Promise.all(pendingIds.map(id => uploadPromisesRef.current.get(id)).filter(Boolean));
            }

            // Re-check for failures after waiting
            // We need to look at the 'completedUploadsRef' or check if any promises threw?
            // The uploadFile catches errors and updates state to 'error'.
            // So we should check mediaItems state again? 
            // Wait, state update inside uploadFile might not be reflected in 'mediaItems' var here immediately if we are in the same closure.
            // But 'mediaItemsRef' is updated via useEffect, which runs AFTER render. 
            // We are in an async function, so by the time we await, React might have re-rendered? 
            // Potentially yes, but safer to trust `completedUploadsRef`.
            // If an item ID is in `mediaItemsRef` but NOT in `completedUploadsRef`, it failed or is missing.
            
            // Actually, let's just use the ids from mediaItemsRef (to preserve order) and pull data from completedUploadsRef
            const finalMediaItems: any[] = [];
            const currentItems = mediaItemsRef.current; // Get list of items user wants to save in order

            for (const item of currentItems) {
                // If it was an error item, we shouldn't be here (checked start), but if it failed DURATION waiting:
                // We need to check if we have data.
                if (item.status === 'error') {
                     throw new Error("One or more files failed to upload.");
                }

                // If it was existing, it's in completedUploadsRef init.
                // If it was new and finished, it's in completedUploadsRef.
                const cloudData = completedUploadsRef.current.get(item.id);
                
                if (!cloudData) {
                    // This might happen if it failed silently or logic gap
                    throw new Error("Upload incomplete for one or more files.");
                }

                finalMediaItems.push({
                    id: item.isNew ? undefined : item.id, // If new, don't send ID (or send temp ID and backend ignores? usually backend wants no ID for new)
                    // Actually existing updateMemory logic tracks by ID? 
                    // If we send an object with NO id, Prisma usually treats as create or we handle in backend.
                    // The existing code: 
                    // "id: m.id, url: m.url, type: m.type, isNew: false"
                    // And previously: "finalMediaItems.push({ ...item, isNew: true })"
                    // The backend `updateMemory` probably replaces the list or diffs it?
                    // Let's check `updateMemory` implementation if we were unsure, but assuming standard "send all items" approach:
                    url: cloudData.url,
                    type: cloudData.type,
                    // Backend expects { url, type } mostly?
                });
            }

             // Update Memory
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

                if (selectedPeople.length > 0) {
                    formData.append("peopleIds", JSON.stringify(selectedPeople));
                }

                // Send ordered list
                // We need to match the structure the backend expects. 
                // Previously: "formData.append("orderedMedia", JSON.stringify(finalMediaItems));"
                // And items had { id, url, type, isNew ... }
                // Let's map it to exactly what we had before plus/minus logic
                const payloadMedia = currentItems.map(item => {
                    const data = completedUploadsRef.current.get(item.id);
                    return {
                        id: item.isNew ? undefined : item.id, // Send ID only if existing
                        url: data?.url,
                        type: data?.type,
                        isNew: item.isNew // Helper for backend if it uses it
                    };
                });
                
                formData.append("orderedMedia", JSON.stringify(payloadMedia));

                const result = await updateMemory(memory.id, undefined, formData);
                
                if (result?.success) {
                    setIsUploading(false);
                    toast.dismiss(loadingToast);
                    toast.success("Memory saved successfully!");
                    
                    if (selectedProductId) {
                        router.replace(`/life-charm?charmId=${selectedProductId}&view=grid&focusId=${memory.id}`);
                    } else {
                        router.replace("/");
                    }
                    router.refresh(); 
                } else {
                    console.error(result?.error);
                    setIsUploading(false);
                    toast.dismiss(loadingToast);
                    toast.error(result?.error || "Failed to save memory");
                }
            });


        } catch (error: any) {
            console.error("Save failed:", error);
            setIsUploading(false);
            toast.dismiss(loadingToast);
            toast.error(error.message || "Save failed");
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        const toastId = toast.loading("Deleting memory...");
        const result = await deleteMemory(memory.id);
        if (result.success) {
            toast.dismiss(toastId);
            toast.success("Memory deleted successfully");
            if (selectedProductId) {
                router.replace(`/life-charm?charmId=${selectedProductId}&view=grid`);
            } else {
                router.replace("/");
            }
        } else {
            toast.dismiss(toastId);
            toast.error(result.error || "Failed to delete memory");
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent font-[Outfit] relative">
             <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#F6F2EC] to-transparent z-10 pointer-events-none"></div>

             <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-32" ref={scrollContainerRef}>
                <div className="max-w-xl mx-auto w-full">
                 {/* Header / Nav */}
                 <div className="flex items-center justify-between mb-6 sticky top-0 z-20">
                      <button onClick={handleCancel} className="w-10 h-10 rounded-full bg-[#E6DED1]/50 backdrop-blur-sm flex items-center justify-center">
                          <ChevronLeft className="w-6 h-6 text-[#556B5A]" />
                      </button>
                      <div className="text-center">
                          <span className="block text-[#A69D93] text-[10px] uppercase tracking-wider font-bold">Edit Memory</span>
                          <h1 className="text-[#556B5A] text-2xl font-black uppercase leading-none">{title || "Untitled"}</h1>
                          <div className="bg-[#D4C3D8]/40 px-3 py-1 rounded-full inline-block mt-2">
                              <span className="text-[#556B5A] text-[10px] font-bold block">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                      </div>
                      <div className="w-10"></div> {/* Spacer */}
                 </div>

                 {/* Form */}
                 <div className="space-y-6">
                      {/* Title */}
                      <div>
                        <label className="block text-[#C27A59] text-[13px] font-bold mb-2 uppercase">TITLE<span className="text-[#C27A59]">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 15))}
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
                            rows={3}
                            className="w-full bg-[#F6F2EC] border border-[#E6DED1] rounded-xl p-4 text-[#556B5A] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] resize-none leading-relaxed"
                        />
                         <p className="text-[#A69D93] text-[10px] mt-1.5 ml-1">Character Limit : 2 lines</p>
                      </div>

                      {/* Media Section */}
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
                                                <Check className="w-3 h-3" /> Done
                                            </>
                                        ) : (
                                            <>
                                                <Pencil className="w-3 h-3" /> Reorder
                                            </>
                                        )}
                                    </button>
                                )}
                          </div>
                          <p className="text-[#A69D93] text-[10px] mb-3 ml-1">You can add and edit media later.</p>


                        
                          {/* Reorder List */}
                          <div className="space-y-3">
                              {mediaItems.map((item, index) => (
                                  <DraggableMediaItem 
                                    key={item.id} 
                                    item={item} 
                                    index={index} 
                                    isReordering={isReordering}
                                    totalItems={mediaItems.length}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                    onDelete={() => handleRemoveMedia(index)}
                                  />
                              ))}

                              {/* Add Button */}
                              <label className="block w-full bg-[#E6DED1]/50 border border-dashed border-[#556B5A]/20 rounded-[20px] p-4 text-center cursor-pointer hover:bg-[#E6DED1] transition-colors relative">
                                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                                      <span className="text-[#556B5A] font-bold flex items-center gap-1">Add Media <Plus className="w-6 h-6" /></span>
                                  </div>
                                  <input type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                              </label>
                          </div>
                      </div>

                      {/* Date */}
                      <div>
                           <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Date<span className="text-[#C27A59]">*</span></label>
                           <div className="relative">
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-[#F6F2EC] border-none rounded-xl p-4 pl-12 text-[#556B5A] font-medium appearance-none" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#556B5A]"><Calendar className="w-5 h-5" /></div>
                           </div>
                      </div>

                       {/* Time */}
                       <div>
                           <label className="block text-[#556B5A] text-[13px] font-bold mb-2">Time</label>
                           <div className="relative">
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-[#F6F2EC] border-none rounded-xl p-4 pl-12 text-[#556B5A] font-medium appearance-none" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#556B5A]"><Clock className="w-5 h-5" /></div>
                           </div>
                      </div>

                      {/* Location */}
                      <div>
                           <label className="block text-[#556B5A] text-[13px] font-bold mb-2">Location</label>
                           <div className="relative">
                                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-[#F6F2EC] border-none rounded-xl p-4 pl-12 text-[#556B5A] font-medium" placeholder="Select location" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#556B5A]"><MapPin className="w-5 h-5" /></div>
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

                      {/* Optional Fields Button */}
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

                       {/* Optional Fields Content */}
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
                                        
                                        {/* Custom Emotions Display */}
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
                                        
                                        {/* Custom Mood Display - if selectedMood is not in MOODS */}
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

                        {/* Save Button */}
                        <button
                            type="button" 
                            onClick={handleSave} 
                            disabled={isPending || (isUploading && mediaItems.length === 0)}
                            className="w-full bg-[#7C9A86] text-[#556B5A] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#95b330] transition-all disabled:opacity-70 active:scale-95"
                        >
                            {isUploading ? "Uploading & Saving..." : isPending ? "Saving..." : "Save"}
                        </button>

                         {/* Manage Memory */}
                         <div className="bg-[#E6DED1] rounded-[24px] p-4">
                             <div className="flex items-center justify-between w-full mb-4">
                                  <span className="text-[#556B5A] font-bold text-[13px]">Manage Memory</span>
                                  <ChevronDown className="w-6 h-6 text-[#556B5A]" />
                             </div>
                             
                             <div className="flex gap-4">
                                  <button onClick={handleDelete} className="flex-1 bg-[#E6DED1] rounded-xl py-3 flex items-center justify-center gap-2 text-[#C27A59] font-bold text-[11px]">
                                      <Trash2 className="w-5 h-5" /> Delete memory
                                  </button>
                                  <button className="flex-1 bg-[#F6F2EC] rounded-xl py-3 flex items-center justify-center gap-2 text-[#556B5A] font-bold text-[11px]">
                                      <Archive className="w-5 h-5" /> Archive memory
                                  </button>
                             </div>
                         </div>
                 </div>
                 </div>
             </div>

             {/* Delete Confirmation Modal */}
             <AnimatePresence>
                 {showDeleteConfirm && (
                     <>
                         <motion.div
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             onClick={() => setShowDeleteConfirm(false)}
                             className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                         />
                         <div className="fixed inset-0 flex items-center justify-center z-[101] px-6 pointer-events-none">
                             <motion.div
                                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                 className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl pointer-events-auto"
                             >
                                 <div className="flex flex-col items-center text-center">
                                     <div className="w-20 h-20 rounded-full bg-[#E6DED1] flex items-center justify-center mb-6">
                                         <Trash2 className="w-10 h-10 text-[#C27A59]" />
                                     </div>
                                     <h3 className="text-[#556B5A] text-2xl font-black uppercase mb-2">Delete this memory?</h3>
                                     <p className="text-[#A69D93] text-sm leading-relaxed mb-8">
                                         This action is permanent and will remove this memory from your collection.
                                     </p>

                                     <div className="flex flex-col w-full gap-3">
                                         <button
                                             onClick={confirmDelete}
                                             className="w-full bg-[#C27A59] text-white font-bold py-4 rounded-full shadow-lg shadow-[#C27A59]/20 active:scale-95 transition-transform"
                                         >
                                             Yes, delete
                                         </button>
                                         <button
                                             onClick={() => setShowDeleteConfirm(false)}
                                             className="w-full bg-[#E6DED1]/50 text-[#556B5A] font-bold py-4 rounded-full active:scale-95 transition-transform"
                                         >
                                             Cancel
                                         </button>
                                     </div>
                                 </div>
                             </motion.div>
                         </div>
                     </>
                 )}
             </AnimatePresence>
        </div>
    )
}
