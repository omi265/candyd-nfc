"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Image as ImageIcon,
  Video,
  X,
  Upload,
  ChevronDown,
} from "lucide-react";
import { getListItem, markAsLived } from "@/app/actions/life-charm";
import { getPeople, createPerson } from "@/app/actions/people";
import { deleteUploadedFile } from "@/app/actions/upload";
import { uploadMedia } from "@/lib/upload-client";
import { Person, LifeListItem } from "@prisma/client";
import { toast } from "sonner";
import Image from "@/components/media-image";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  size: number;
  status: "uploading" | "complete" | "error";
  progress: number;
}

export default function MarkAsLivedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const itemId = params.id as string;
  const charmId = searchParams.get("charmId");

  const [item, setItem] = useState<LifeListItem | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [reflection, setReflection] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!charmId || !itemId) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      const [itemData, peopleData] = await Promise.all([
        getListItem(itemId),
        getPeople(),
      ]);

      if (!itemData || itemData.status === "lived") {
        router.push(`/life-charm?charmId=${charmId}&view=list`);
        return;
      }

      setItem(itemData);
      setPeople(peopleData);
      // Pre-select people from the item
      setSelectedPeople(itemData.peopleIds || []);
    };

    fetchData();
  }, [itemId, charmId, router]);

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

      const mediaId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newMedia: MediaItem = {
        id: mediaId,
        url: "",
        type: mediaType,
        size: file.size,
        status: "uploading",
        progress: 0,
      };

      setMedia((prev) => [...prev, newMedia]);

      try {
        // Get signature with specific folder
        const data = await uploadMedia(file);

        if (data.secure_url) {
          setMedia((prev) =>
            prev.map((m) =>
              m.id === mediaId
                ? { ...m, url: data.secure_url, status: "complete", progress: 100 }
                : m
            )
          );
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        setMedia((prev) =>
          prev.map((m) =>
            m.id === mediaId ? { ...m, status: "error" } : m
          )
        );
        toast.error("Failed to upload file");
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = async (mediaId: string) => {
    const item = media.find((mediaItem) => mediaItem.id === mediaId);
    if (item?.status === "complete" && item.url) {
      await deleteUploadedFile(item.url).catch((error) => {
        console.error("Failed to discard uploaded media", error);
      });
    }
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const discardUploadsAndLeave = async () => {
    await Promise.allSettled(
      media
        .filter((item) => item.status === "complete" && item.url)
        .map((item) => deleteUploadedFile(item.url))
    );
    router.push(`/life-charm?charmId=${charmId}&view=list`);
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

    const completedMedia = media.filter((m) => m.status === "complete");

    startTransition(async () => {
      const result = await markAsLived(itemId, {
        date,
        location: location.trim() || undefined,
        reflection: reflection.trim() || undefined,
        peopleIds: selectedPeople.length > 0 ? selectedPeople : undefined,
        mediaUrls: completedMedia.map((m) => m.url),
        mediaTypes: completedMedia.map((m) => m.type),
        mediaSizes: completedMedia.map((m) => m.size),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Experience saved!");
        router.push(`/life-charm?charmId=${charmId}&view=grid&focusId=${itemId}`);
      }
    });
  };

  if (!item || !charmId) {
    return (
      <div className="min-h-dvh bg-transparent flex items-center justify-center">
        <div className="animate-pulse text-[#556B5A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-transparent flex flex-col ">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#556B5A]/10">
        <button
          onClick={discardUploadsAndLeave}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#556B5A]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#556B5A]">Mark as Lived</h1>
          <p className="text-sm text-[#556B5A]/60 line-clamp-1">{item.title}</p>
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
                  .map((id) => people.find((p) => p.id === id)?.name)
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
              {people.map((person) => (
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
            placeholder="Share your thoughts and feelings about this experience..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] placeholder-[#556B5A]/30 outline-none focus:border-[#556B5A]/30 resize-none"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#556B5A]/60 mb-2">
            <ImageIcon className="w-4 h-4" />
            Photos & Videos (optional)
          </label>

          {/* Media Grid */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="aspect-square rounded-xl overflow-hidden bg-[#E6DED1] relative"
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
                      src={m.url}
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
                    onClick={() => removeMedia(m.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-[#556B5A]/20 rounded-xl flex items-center justify-center gap-2 text-[#556B5A]/60 hover:border-[#556B5A]/40 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Add photos or videos</span>
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F6F2EC] via-[#F6F2EC] to-transparent pt-12">
        <button
          onClick={handleSubmit}
          disabled={!date || isPending}
          className="w-full py-4 bg-[#7C9A86] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#556B5A] transition-colors disabled:opacity-50"
        >
          {isPending ? (
            "Saving..."
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Save Experience
            </>
          )}
        </button>
      </div>
    </div>
  );
}
