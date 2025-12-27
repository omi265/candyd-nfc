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

// ... (constants and DraggableMediaItem remain same)

// ...

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

    // ... (Unified Media State) ...

    useEffect(() => {
        getPeople().then(setPeople);
    }, []);

    // ... (handleFileChange, uploadFile remain same)

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

    // ... (toggleEmotion etc remain same)

    // ... (handleSave logic) 
    
    // In handleSave:
    const handleSave = async () => {
        // ... (preamble) ...
        // ...
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
    // ...
    // ...
    // ... (rest of function)
    };

    // ... (handleDelete)

    return (
        // ... (jsx)
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
                            {/* ... (Event UI) ... */}
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

