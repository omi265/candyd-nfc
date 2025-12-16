"use client";

import { updateMemory, deleteMemory } from "@/app/actions/memories";
import { getCloudinarySignature } from "@/app/actions/upload";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";

// --- Icons ---
function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PlusIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 18V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}

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
function ArchiveIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><polyline points="21 8 21 21 3 21 3 8" strokeWidth="2"/><rect x="1" y="3" width="22" height="5" strokeWidth="2"/><line x1="10" y1="12" x2="14" y2="12" strokeWidth="2"/></svg>; }

const EMOTIONS = ["Joy", "Peace", "Gratitude", "Sad", "Pride", "Longing", "Comfort", "Fear", "Love", "Melancholy"];
const MOODS = ["Serene", "Celebratory", "Nostalgic", "Dreamy", "Quiet", "Vibrant", "Tender", "Bittersweet"];

interface MemoryClientPageProps {
    memory: any;
    products: any[];
}

// --- Edit Mode (Now the Main/Only Mode for this Page) ---

export default function MemoryClientPage({ memory, products }: MemoryClientPageProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
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

    // New Media State
    const [newMedia, setNewMedia] = useState<File[]>([]); 
    const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
    
    // Existing Media (Display Only for now)
    const existingMedia = memory.media || [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setNewMedia(prev => [...prev, ...files]);
            
            const previews = files.map(file => URL.createObjectURL(file));
            setNewMediaPreviews(prev => [...prev, ...previews]);
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
        try {
            // Upload New Media
            const uploadedUrls: string[] = [];
            const uploadedTypes: string[] = [];

            if (newMedia.length > 0) {
                const signatureData = await getCloudinarySignature();
                const { signature, timestamp, folder, cloudName, apiKey } = signatureData;

                for (const file of newMedia) {
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

                    if (!response.ok) throw new Error("Upload failed");
                    const data = await response.json();
                    uploadedUrls.push(data.secure_url);
                    uploadedTypes.push(data.resource_type);
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
                
                if (uploadedUrls.length > 0) {
                    formData.append("mediaUrls", JSON.stringify(uploadedUrls));
                    formData.append("mediaTypes", JSON.stringify(uploadedTypes));
                }

                const result = await updateMemory(memory.id, undefined, formData);
                
                if (result?.success) {
                    setNewMedia([]);
                    setNewMediaPreviews([]);
                    setIsUploading(false);
                    router.push("/");
                    router.refresh(); 
                } else {
                    console.error(result?.error);
                    setIsUploading(false);
                }
            });

        } catch (error) {
            console.error("Save failed:", error);
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this memory?")) {
             const result = await deleteMemory(memory.id);
             if (result.success) {
                 router.push("/");
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
                          <BackIcon />
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
                          <label className="block text-[#C27A59] text-[13px] font-bold mb-1">Media<span className="text-[#C27A59]">*</span></label>
                          <p className="text-[#A68CAB] text-[10px] mb-3 ml-1">You can add and edit media later.</p>

                          <div className="flex gap-3 mb-4">
                              <button type="button" className="flex-1 bg-[#5B2D7D] text-white py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold shadow-sm">
                                  <ImageIcon /> Image
                              </button>
                              <button type="button" className="flex-1 bg-[#FFF5F0] border border-[#EADDDE] text-[#5B2D7D] py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold">
                                  <VideoIcon /> Video
                              </button>
                               <button type="button" className="flex-1 bg-[#FFF5F0] border border-[#EADDDE] text-[#5B2D7D] py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold">
                                  <AudioIcon /> Audio
                              </button>
                          </div>
                        
                          {/* Grid of Existing + New Media */}
                          <div className="space-y-3">
                              {/* Existing */}
                              {existingMedia.map((m: any) => (
                                  <div key={m.id} className="relative rounded-[20px] overflow-hidden bg-gray-200">
                                      {m.type.startsWith('video') ? (
                                           <video src={m.url} className="w-full h-48 object-cover" controls />
                                      ) : (
                                           <img src={m.url} alt="media" className="w-full h-auto object-cover" />
                                      )}
                                  </div>
                              ))}
                              
                               {/* New Previews */}
                               {newMediaPreviews.map((src, i) => (
                                  <div key={i} className="relative rounded-[20px] overflow-hidden bg-gray-200 border-2 border-[#A4C538]">
                                      <img src={src} alt="new preview" className="w-full h-auto object-cover opacity-80" />
                                       <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="bg-[#A4C538] text-[#5B2D7D] text-xs px-2 py-1 rounded-full font-bold">New</span>
                                       </div>
                                  </div>
                              ))}

                              {/* Add Button */}
                              <label className="block w-full bg-[#EADDDE]/50 border border-dashed border-[#5B2D7D]/20 rounded-[20px] p-4 text-center cursor-pointer hover:bg-[#EADDDE] transition-colors relative">
                                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                                      <span className="text-[#5B2D7D] font-bold flex items-center gap-1">Add image <PlusIcon /></span>
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
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><CalendarIcon /></div>
                           </div>
                      </div>

                       {/* Time */}
                       <div>
                           <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Time</label>
                           <div className="relative">
                                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] font-medium appearance-none" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><ClockIcon /></div>
                           </div>
                      </div>

                      {/* Location */}
                      <div>
                           <label className="block text-[#5B2D7D] text-[13px] font-bold mb-2">Location</label>
                           <div className="relative">
                                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-[#FFF5F0] border-none rounded-xl p-4 pl-12 text-[#5B2D7D] font-medium" placeholder="Select location" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B2D7D]"><LocationIcon /></div>
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.9201 8.95001L13.4001 15.47C12.6301 16.24 11.3701 16.24 10.6001 15.47L4.08008 8.95001" stroke="#5B2D7D" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
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
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-0">
                                     <path d="M6 9L12 15L18 9" stroke="#5B2D7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                             </div>
                             
                             <div className="flex gap-4">
                                  <button onClick={handleDelete} className="flex-1 bg-[#FBE0D6] rounded-xl py-3 flex items-center justify-center gap-2 text-[#C27A59] font-bold text-[11px]">
                                      <TrashIcon /> Delete memory
                                  </button>
                                  <button className="flex-1 bg-[#FFF5F0] rounded-xl py-3 flex items-center justify-center gap-2 text-[#5B2D7D] font-bold text-[11px]">
                                      <ArchiveIcon /> Archive memory
                                  </button>
                             </div>
                         </div>
                 </div>
             </div>
        </div>
    )
}
