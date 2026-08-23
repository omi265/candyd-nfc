"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Image as ImageIcon,
  X,
  Upload,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { 
    updateExperience, 
    addExperienceMedia, 
    deleteExperienceMedia 
} from "@/app/actions/life-charm";
import { createPerson } from "@/app/actions/people";
import { deleteUploadedFile } from "@/app/actions/upload";
import { uploadMedia } from "@/lib/upload-client";
import { Person, Experience, ExperienceMedia, LifeListItem } from "@prisma/client";
import { toast } from "sonner";
import { getOptimizedUrl } from "@/lib/media-helper";
import Image from "@/components/media-image";

type ExperienceWithRelations = Experience & {
  media: ExperienceMedia[];
  item: LifeListItem;
};

interface EditExperienceClientProps {
  experience: ExperienceWithRelations;
  people: Person[];
  charmId: string;
}

interface MediaItem {
  id: string; // Database ID or Temp ID
  url: string;
  type: "image" | "video" | "audio";
  size: number;
  status: "existing" | "uploading" | "complete" | "error";
  progress: number;
  isNew?: boolean;
}

export default function EditExperienceClient({
  experience,
  people,
  charmId,
}: EditExperienceClientProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date(experience.date).toISOString().split("T")[0]);
  const [location, setLocation] = useState(experience.location || "");
  const [reflection, setReflection] = useState(experience.reflection || "");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(experience.peopleIds);
  
  // Initialize media state with existing media
  const [media, setMedia] = useState<MediaItem[]>(
      experience.media.map(m => ({
          id: m.id,
          url: m.url,
          type: m.type as "image" | "video" | "audio",
          size: m.size,
          status: "existing",
          progress: 100
      }))
  );

  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [peopleList, setPeopleList] = useState(people);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;

    setIsAddingPerson(true);
    const result = await createPerson({ name: newPersonName.trim() });
    setIsAddingPerson(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.person) {
      setPeopleList([...peopleList, result.person]);
      setSelectedPeople([...selectedPeople, result.person.id]);
      setNewPersonName("");
      toast.success(`Added ${result.person.name}`);
    }
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : "audio";

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newMedia: MediaItem = {
        id: tempId,
        url: "",
        type: mediaType,
        size: file.size,
        status: "uploading",
        progress: 0,
        isNew: true
      };

      setMedia((prev) => [...prev, newMedia]);

      try {
        const data = await uploadMedia(file);

        if (data.secure_url) {
          setMedia((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, url: data.secure_url, status: "complete", progress: 100 }
                : m
            )
          );
        } else {
          throw new Error("Upload failed");
        }
      } catch {
        setMedia((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "error" } : m
          )
        );
        toast.error("Failed to upload file");
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = async (mediaItem: MediaItem) => {
      if (mediaItem.status === "existing") {
          // Delete from server immediately
          if (confirm("Are you sure you want to remove this media?")) {
              const result = await deleteExperienceMedia(mediaItem.id);
              if (result.success) {
                  setMedia(prev => prev.filter(m => m.id !== mediaItem.id));
                  toast.success("Media removed");
              } else {
                  toast.error("Failed to remove media");
              }
          }
      } else {
          if (mediaItem.status === "complete" && mediaItem.url) {
              await deleteUploadedFile(mediaItem.url).catch((error) => {
                  console.error("Failed to discard uploaded media", error);
              });
          }
          setMedia(prev => prev.filter(m => m.id !== mediaItem.id));
      }
  };

  const discardNewUploadsAndLeave = async () => {
      await Promise.allSettled(
          media
              .filter((item) => item.isNew && item.status === "complete" && item.url)
              .map((item) => deleteUploadedFile(item.url))
      );
      router.push(`/life-charm/experience/${experience.id}?charmId=${charmId}`);
  };

  const handleSubmit = () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    const uploadingMedia = media.filter((m) => m.status === "uploading");
    if (uploadingMedia.length > 0) {
      toast.error("Please wait for uploads to complete");
      return;
    }

    const newMediaItems = media.filter(m => m.isNew && m.status === "complete");

    startTransition(async () => {
      // 1. Update basic info
      const updateResult = await updateExperience(experience.id, {
        date,
        location: location.trim() || undefined,
        reflection: reflection.trim() || undefined,
        peopleIds: selectedPeople,
      });

      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      // 2. Add new media if any
      if (newMediaItems.length > 0) {
          const mediaPayload = newMediaItems.map(m => ({
              url: m.url,
              type: m.type,
              size: m.size
          }));
          
          const addMediaResult = await addExperienceMedia(experience.id, mediaPayload);
          if (addMediaResult.error) {
              toast.error("Info updated, but failed to add new media");
              return;
          }
      }

      toast.success("Experience updated!");
      router.push(`/life-charm/experience/${experience.id}?charmId=${charmId}`);
    });
  };

  return (
    <div className="min-h-dvh bg-transparent flex flex-col ">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#556B5A]/10 bg-[#F6F2EC]">
        <button
          onClick={discardNewUploadsAndLeave}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#556B5A]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#556B5A]">Edit Experience</h1>
          <p className="text-sm text-[#556B5A]/60 line-clamp-1">{experience.item.title}</p>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto pb-32">
        {/* Date */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <Calendar className="w-4 h-4" />
            When did this happen? *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] outline-none focus:border-[#556B5A]/30"
          />
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <MapPin className="w-4 h-4" />
            Where? (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Sunset Point, Goa"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] placeholder-[#556B5A]/30 outline-none focus:border-[#556B5A]/30"
          />
        </div>

        {/* People */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <Users className="w-4 h-4" />
            Who was there? (optional)
          </label>
          <button
            onClick={() => setShowPeopleSelector(!showPeopleSelector)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-left flex items-center justify-between"
          >
            {selectedPeople.length > 0 ? (
              <span className="text-[#556B5A]">
                {selectedPeople
                  .map((id) => peopleList.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ) : (
              <span className="text-[#556B5A]/30">Select people</span>
            )}
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
              className="mt-2 p-3 bg-white rounded-xl border border-[#556B5A]/10 space-y-2"
            >
              {peopleList.map((person) => (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between ${
                    selectedPeople.includes(person.id)
                      ? "bg-[#556B5A] text-white"
                      : "hover:bg-[#E6DED1]/50 text-[#556B5A]"
                  }`}
                >
                  {person.name}
                  {selectedPeople.includes(person.id) && <span>✓</span>}
                </button>
              ))}

              <div className="flex gap-2 pt-2 border-t border-[#556B5A]/10">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Add someone new..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#E6DED1]/30 text-[#556B5A] placeholder-[#556B5A]/30 outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                />
                <button
                  onClick={handleAddPerson}
                  disabled={!newPersonName.trim() || isAddingPerson}
                  className="px-3 py-2 bg-[#556B5A] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isAddingPerson ? "..." : "Add"}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Reflection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <Sparkles className="w-4 h-4" />
            How was it? (optional)
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Share your thoughts and feelings..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] placeholder-[#556B5A]/30 outline-none focus:border-[#556B5A]/30 resize-none"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <ImageIcon className="w-4 h-4" />
            Photos & Videos
          </label>

          {/* Media Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {media.map((m) => (
              <div
                key={m.id}
                className="aspect-square rounded-xl overflow-hidden bg-[#E6DED1] relative group"
              >
                {m.status === "uploading" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-[#556B5A] border-t-transparent rounded-full" />
                  </div>
                ) : m.status === "error" ? (
                  <div className="w-full h-full flex items-center justify-center text-red-500">
                    <X className="w-6 h-6" />
                  </div>
                ) : m.type === "image" ? (
                  <Image
                    src={getOptimizedUrl(m.url, "image", 200)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
                
                <button
                  onClick={() => handleRemoveMedia(m)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}

            {/* Upload Button Block */}
            <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#556B5A]/20 flex flex-col items-center justify-center gap-1 text-[#556B5A]/60 hover:border-[#556B5A]/40 transition-colors bg-white/50"
            >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Add</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F6F2EC] via-[#F6F2EC] to-transparent pt-12">
        <button
          onClick={handleSubmit}
          disabled={!date || isPending}
          className="w-full py-4 bg-[#7C9A86] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#556B5A] transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
