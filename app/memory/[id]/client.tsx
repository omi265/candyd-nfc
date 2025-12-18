"use client";

import { updateMemory, deleteMemory } from "@/app/actions/memories";
import { getCloudinarySignature } from "@/app/actions/upload";
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
    Check
} from "lucide-react";
import { toast } from "sonner";
import AudioPlayer from "@/app/components/AudioPlayer";

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

interface DraggableMediaItemProps {
    item: any;
    index: number;
    isReordering: boolean;
}

const DraggableMediaItem = ({ item, index, isReordering }: DraggableMediaItemProps) => {
    return (
        <Reorder.Item
            value={item}
            dragListener={isReordering}
            className={`relative rounded-[20px] overflow-hidden bg-gray-200 select-none ${
                item.type === 'audio' ? 'h-24' : ''
            } ${isReordering ? "cursor-grab active:cursor-grabbing touch-none ring-2 ring-[#5B2D7D] ring-offset-2 ring-offset-[#FDF2EC]" : "cursor-default"}`}
            style={{ touchAction: isReordering ? "none" : "pan-y" }} 
        >
              {item.type.includes('video') ? (
                   <video src={item.url} className="w-full h-48 object-cover pointer-events-none" />
              ) : item.type === 'audio' ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#FFF5F0] p-2 pointer-events-none">
                        <div className="w-full pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                            <AudioPlayer src={item.url} className="w-full bg-transparent! p-0! shadow-none" />
                        </div>
                    </div>
              ) : (
                   <img src={item.url} alt="media" className="w-full h-auto object-cover pointer-events-none" />
              )}
              
              {/* Indicators */}
              <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start pointer-events-none">
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
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>(memory.emotions || []);
    const [selectedMood, setSelectedMood] = useState<string | null>(memory.mood || null);
    const [selectedProductId, setSelectedProductId] = useState<string>(memory.productId || "");

    // Unified Media State
    const [mediaItems, setMediaItems] = useState<{
        id: string;
        url: string;
        type: string;
        isNew: boolean;
        file?: File;
        size?: number;
    }[]>(() => {
        return (memory.media || []).map((m: any) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            isNew: false
        }));
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newItems = files.map(file => ({
                id: `temp-${Date.now()}-${Math.random()}`,
                url: URL.createObjectURL(file),
                type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
                isNew: true,
                file: file
            }));
            setMediaItems(prev => [...prev, ...newItems]);
        }
    };

    const toggleEmotion = (emotion: string) => {
        setSelectedEmotions(prev => prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]);
    };

    const handleCancel = () => {
        router.push("/");
    };

    const handleSave = async () => {
        setIsUploading(true);
        const loadingToast = toast.loading("Saving memory...");

        try {
            // Process Media Items (Upload new ones)
            const finalMediaItems: typeof mediaItems = [];
            
            const signatureData = await getCloudinarySignature();
            const { signature, timestamp, folder, cloudName, apiKey } = signatureData;

            for (const item of mediaItems) {
                if (item.isNew && item.file) {
                    // Upload
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

                    if (!response.ok) throw new Error("Upload failed for one or more files");
                    const data = await response.json();
                    
                    finalMediaItems.push({
                        ...item,
                        url: data.secure_url,
                        type: (item.type === 'audio' || item.file?.type.startsWith('audio')) ? 'audio' : data.resource_type,
                        size: data.bytes,
                        isNew: true // Mark as new for DB creation
                    });
                } else {
                    finalMediaItems.push(item);
                }
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
                
                // Send ordered list
                formData.append("orderedMedia", JSON.stringify(finalMediaItems));

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
             <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FDF2EC] to-transparent z-10 pointer-events-none"></div>

             <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-32">
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
                              <Reorder.Group axis="y" values={mediaItems} onReorder={setMediaItems} className="space-y-3">
                                  {mediaItems.map((item, index) => (
                                      <DraggableMediaItem key={item.id} item={item} index={index} isReordering={isReordering} />
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
                                        <div className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6]">Other</div>
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
                                        <div className="px-5 py-2.5 rounded-xl text-[13px] bg-[#FFF5F0] text-[#A68CAB] border border-[#FBE0D6]">Other</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>

                        {/* Save Button */}
                        <button
                            type="button" 
                            onClick={handleSave} 
                            disabled={isPending || isUploading}
                            className="w-full bg-[#A4C538] text-[#5B2D7D] text-[15px] font-bold h-[56px] rounded-[28px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#95b330] transition-all disabled:opacity-70 active:scale-95"
                        >
                            {isUploading ? "Uploading..." : isPending ? "Saving..." : "Save"}
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
    )
}
