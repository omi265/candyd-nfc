"use client";

import { useRef } from "react";
import { updateMemory, deleteMemory } from "@/app/actions/memories";
import { getCloudinarySignature, deleteUploadedFile } from "@/app/actions/upload";
import { getPeople, createPerson } from "@/app/actions/people";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";

import {
    ChevronLeft,
    Plus,
    Calendar,
    Clock,
    MapPin,
    Image as ImageIcon,
    Video as VideoIcon,
    Mic,
    Trash2,
    Archive,
    ChevronDown,
    Pencil,
    Check,
    RefreshCw,
    GripVertical,
    X,
    Users
} from "lucide-react";
import { toast } from "sonner";
import AudioPlayer from "@/app/components/AudioPlayer";
import { getOptimizedUrl } from "@/lib/media-helper";

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const EVENTS = ["Pre Wedding Celebrations", "Haldi", "Sangeet", "Mehendi", "Wedding"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

interface DraggableMediaItemProps {
    item: any;
    index: number;
    isReordering: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const DraggableMediaItem = ({ item, index, isReordering, scrollContainerRef }: DraggableMediaItemProps) => {
    const contextControls = useDragControls();
    
    // Auto-scroll logic
    const autoScrollId = useRef<number | null>(null);
    const pointerY = useRef<number>(0);
    const isDragging = useRef(false);

    const checkAutoScroll = () => {
        if (!isDragging.current || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const { top, bottom } = container.getBoundingClientRect();
        const y = pointerY.current;

        const zoneHeight = 80; // slightly smaller zone
        let scrollSpeed = 0;

        if (y < top + zoneHeight) {
             const dist = Math.max(0, (top + zoneHeight) - y);
             // smoother easing?
             scrollSpeed = -Math.min(dist * 0.3, 15); 
        } else if (y > bottom - zoneHeight) {
             const dist = Math.max(0, y - (bottom - zoneHeight));
             scrollSpeed = Math.min(dist * 0.3, 15);
        }

        if (scrollSpeed !== 0) {
            container.scrollTop += scrollSpeed;
        }
        
        autoScrollId.current = requestAnimationFrame(checkAutoScroll);
    };
    
    // We only want to allow drag if isReordering is true
    // But dragControls.start(e) must be called from pointer down
    
    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={contextControls}
            dragMomentum={false} 
            onDragStart={() => {
                isDragging.current = true;
                autoScrollId.current = requestAnimationFrame(checkAutoScroll);
            }}
            onDrag={(e, info) => {
                pointerY.current = info.point.y;
            }}
            onDragEnd={() => {
                isDragging.current = false;
                if (autoScrollId.current) {
                    cancelAnimationFrame(autoScrollId.current);
                    autoScrollId.current = null;
                }
            }}
            className={`relative rounded-[20px] overflow-hidden bg-gray-200 select-none ${
                item.type === 'audio' ? 'h-24' : ''
            } ${isReordering ? "ring-2 ring-[#5B2D7D] ring-offset-2 ring-offset-[#FDF2EC]" : ""}`}
            style={{ 
                touchAction: "pan-y", 
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
            }} 
        >
              {item.type?.includes('video') ? (
                   <video src={getOptimizedUrl(item.url, 'video', 1080)} className="w-full h-48 object-cover pointer-events-none" />
              ) : item.type === 'audio' ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#FFF5F0] p-2 pointer-events-none">
                        <div className="w-full pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                            <AudioPlayer src={item.url} className="w-full bg-transparent! p-0! shadow-none" />
                        </div>
                    </div>
              ) : (
                   <img src={getOptimizedUrl(item.url, 'image', 1080)} alt="media" className="w-full h-auto object-cover pointer-events-none" />
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
                      <span className="bg-[#5B2D7D] text-[#A4C538] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                          COVER
                      </span>
                  )}
                  {item.isNew && (
                      <span className={`bg-[#A4C538] text-[#5B2D7D] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${index === 0 ? 'ml-auto' : ''}`}>
                          NEW
                      </span>
                  )}
              </div>
              
              {/* Drag Handle Overlay */}
              <AnimatePresence>
                {isReordering && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-end pr-4 bg-black/10 backdrop-blur-[1px]"
                    >
                        <div 
                            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                            onPointerDown={(e) => contextControls.start(e)}
                        >
                            <GripVertical className="w-6 h-6 text-[#5B2D7D]" />
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
        </Reorder.Item>
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

    // Form State
    const [title, setTitle] = useState(memory.title);
    const [description, setDescription] = useState(memory.description);
    const [date, setDate] = useState(() => new Date(memory.date).toISOString().split('T')[0]);
    const [time, setTime] = useState(memory.time || "");
    const [location, setLocation] = useState(memory.location || "");
    
    const [selectedEvents, setSelectedEvents] = useState<string[]>(memory.events || []);
    const [customEventInput, setCustomEventInput] = useState("");
    const [showCustomEvent, setShowCustomEvent] = useState(false);

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
            isNew: false,
            status: 'completed',
            cloudData: { url: m.url, type: m.type, size: 0 } // Mock size for existing
        }));
    });

    const uploadPromisesRef = useRef<Map<string, Promise<any>>>(new Map());
    const completedUploadsRef = useRef<Map<string, { url: string, type: string, size: number }>>(
        new Map((memory.media || []).map((m: any) => [m.id, { url: m.url, type: m.type, size: 0 }]))
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
        const processingPromise = (async () => {
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

            const data = await response.json();

            // Determine final type
            const finalType = (item.type === 'audio' || item.file?.type.startsWith('audio')) ? 'audio' : data.resource_type;

            const cloudData = { 
                url: data.secure_url, 
                type: finalType, 
                size: data.bytes 
            };

            completedUploadsRef.current.set(item.id, cloudData);

            setMediaItems(prev => prev.map(i => 
                i.id === item.id 
                ? { ...i, status: 'completed', cloudData, url: data.secure_url, type: finalType } 
                : i
            ));
            
            return data;
        })();

        uploadPromisesRef.current.set(item.id, processingPromise);

        try {
            await processingPromise;
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

    const handleCancel = () => {
        router.push("/");
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
                formData.append("events", selectedEvents.join(","));
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
                    router.push("/");
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

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this memory?")) {
             const toastId = toast.loading("Deleting memory...");
             const result = await deleteMemory(memory.id);
             if (result.success) {
                 toast.dismiss(toastId);
                 toast.success("Memory deleted successfully");
                 router.push("/");
             } else {
                 toast.dismiss(toastId);
                 toast.error(result.error || "Failed to delete memory");
             }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FDF2EC] font-[Outfit] relative">
             <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#FDF2EC] to-transparent z-10 pointer-events-none"></div>

             <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-32" ref={scrollContainerRef}>
                <div className="max-w-xl mx-auto w-full">
                 {/* Header / Nav */}
                 <div className="flex items-center justify-between mb-6 sticky top-0 z-20">
                      <button onClick={handleCancel} className="w-10 h-10 rounded-full bg-[#EADDDE]/50 backdrop-blur-sm flex items-center justify-center">
                          <ChevronLeft className="w-6 h-6 text-[#5B2D7D]" />
                      </button>
                      <div className="text-center">
                          <span className="block text-[#A68CAB] text-[10px] uppercase tracking-wider font-bold">Edit Memory</span>
                          <h1 className="text-[#5B2D7D] text-2xl font-black uppercase leading-none">{title || "Untitled"}</h1>
                          <div className="bg-[#D4C3D8]/40 px-3 py-1 rounded-full inline-block mt-2">
                              <span className="text-[#5B2D7D] text-[10px] font-bold block">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                      </div>
                      <div className="w-10"></div> {/* Spacer */}
                 </div>

                 {/* Form */}
                 <div className="space-y-6">
                      {/* Title */}
                      <div>
                        <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Title<span className="text-[#C27A59]">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 15))}
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
                            rows={3}
                            className="w-full bg-[#FFF5F0] border border-[#EADDDE] rounded-xl p-4 text-[#5B2D7D] placeholder-[#D8C4D0] focus:ring-1 focus:ring-[#C27A59] outline-none text-[13px] resize-none leading-relaxed"
                        />
                         <p className="text-[#A68CAB] text-[10px] mt-1.5 ml-1">Describe you memory in a line or two</p>
                      </div>

                      {/* Media Section */}
                      <div>
                          <div className="flex items-center justify-between mb-1">
                                <label className="block text-[#C27A59] text-[13px] font-bold">Media<span className="text-[#C27A59]">*</span></label>
                                {mediaItems.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsReordering(!isReordering)}
                                        className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                                            isReordering 
                                            ? "bg-[#A4C538] text-[#5B2D7D]" 
                                            : "bg-[#EADDDE] text-[#5B2D7D]"
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
                          <p className="text-[#A68CAB] text-[10px] mb-3 ml-1">You can add and edit media later.</p>


                        
                          {/* Reorder List */}
                          <div className="space-y-3">
                              <Reorder.Group 
                                axis="y" 
                                values={mediaItems} 
                                onReorder={setMediaItems} 
                                className="space-y-3"
                              >
                                  {mediaItems.map((item, index) => (
                                      <DraggableMediaItem 
                                        key={item.id} 
                                        item={item} 
                                        index={index} 
                                        isReordering={isReordering}
                                        scrollContainerRef={scrollContainerRef}
                                      />
                                  ))}
                              </Reorder.Group>

                              {/* Add Button */}
                              <label className="block w-full bg-[#EADDDE]/50 border border-dashed border-[#5B2D7D]/20 rounded-[20px] p-4 text-center cursor-pointer hover:bg-[#EADDDE] transition-colors relative">
                                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                                      <span className="text-[#5B2D7D] font-bold flex items-center gap-1">Add Media <Plus className="w-6 h-6" /></span>
                                  </div>
                                  <input type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*,video/*,audio/*" />
                              </label>
                          </div>
                      </div>

                      {/* Date */}
                      <div>
                           <label className="block text-[#C27A59] text-[13px] font-bold mb-2">Date<span className="text-[#C27A59]">*</span></label>
                           <div className="relative">
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] font-medium appearance-none" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><Calendar className="w-5 h-5" /></div>
                           </div>
                      </div>

                       {/* Time */}
                       <div>
                           <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Time</label>
                           <div className="relative">
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] font-medium appearance-none" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><Clock className="w-5 h-5" /></div>
                           </div>
                      </div>

                      {/* Location */}
                      <div>
                           <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Location</label>
                           <div className="relative">
                                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] font-medium" placeholder="Select location" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><MapPin className="w-5 h-5" /></div>
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
                                
                                {/* Custom Events Display */}
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

                      {/* Optional Fields Button */}
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
                                        
                                        {/* Custom Emotions Display */}
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
                                        
                                        {/* Custom Mood Display - if selectedMood is not in MOODS */}
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

                        {/* Save Button */}
                        <button
                            type="button" 
                            onClick={handleSave} 
                            disabled={isPending || (isUploading && mediaItems.length === 0)}
                            className="w-full bg-[#A4C538] text-[#5B2D7D] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#95b330] transition-all disabled:opacity-70 active:scale-95"
                        >
                            {isUploading ? "Uploading & Saving..." : isPending ? "Saving..." : "Save"}
                        </button>

                         {/* Manage Memory */}
                         <div className="bg-[#EADDDE] rounded-[24px] p-4">
                             <div className="flex items-center justify-between w-full mb-4">
                                  <span className="text-[#5B2D7D] font-bold text-[13px]">Manage Memory</span>
                                  <ChevronDown className="w-6 h-6 text-[#5B2D7D]" />
                             </div>
                             
                             <div className="flex gap-4">
                                  <button onClick={handleDelete} className="flex-1 bg-[#FBE0D6] rounded-xl py-3 flex items-center justify-center gap-2 text-[#C27A59] font-bold text-[11px]">
                                      <Trash2 className="w-5 h-5" /> Delete memory
                                  </button>
                                  <button className="flex-1 bg-[#FFF5F0] rounded-xl py-3 flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-[11px]">
                                      <Archive className="w-5 h-5" /> Archive memory
                                  </button>
                             </div>
                         </div>
                 </div>
                 </div>
             </div>
        </div>
    )
}

