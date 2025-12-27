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
import { getCloudinarySignature } from "@/app/actions/upload";
import { Person, LifeListItem } from "@prisma/client";
import { toast } from "sonner";

interface MediaItem {
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
        router.push(`/life-charm?charmId=${charmId}`);
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

      const tempId = Date.now() + Math.random();
      const newMedia: MediaItem = {
        url: "",
        type: mediaType,
        size: file.size,
        status: "uploading",
        progress: 0,
      };

      setMedia((prev) => [...prev, newMedia]);
      const index = media.length;

      try {
        // Get signature with specific folder
        const signatureData = await getCloudinarySignature("candyd/experiences");
        if (!signatureData || !signatureData.apiKey || !signatureData.cloudName) {
          throw new Error("Failed to get upload signature");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", signatureData.timestamp.toString());
        formData.append("signature", signatureData.signature);
        formData.append("folder", "candyd/experiences");

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${
            mediaType === "image" ? "image" : mediaType === "video" ? "video" : "raw"
          }/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (data.secure_url) {
          setMedia((prev) =>
            prev.map((m, i) =>
              i === index
                ? { ...m, url: data.secure_url, status: "complete", progress: 100 }
                : m
            )
          );
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        setMedia((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, status: "error" } : m
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

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
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
        router.push(`/life-charm/item/${itemId}?charmId=${charmId}`);
      }
    });
  };

  if (!item || !charmId) {
    return (
      <div className="min-h-dvh bg-[#FDF2EC] flex items-center justify-center">
        <div className="animate-pulse text-[#5B2D7D]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#5B2D7D]/10">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#5B2D7D]">Mark as Lived</h1>
          <p className="text-sm text-[#5B2D7D]/60 line-clamp-1">{item.title}</p>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto pb-32">
        {/* Date */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#5B2D7D]/60 mb-2">
            <Calendar className="w-4 h-4" />
            When did this happen? *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] outline-none focus:border-[#5B2D7D]/30"
          />
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#5B2D7D]/60 mb-2">
            <MapPin className="w-4 h-4" />
            Where? (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Sunset Point, Goa"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none focus:border-[#5B2D7D]/30"
          />
        </div>

        {/* People */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#5B2D7D]/60 mb-2">
            <Users className="w-4 h-4" />
            Who was there? (optional)
          </label>
          <button
            onClick={() => setShowPeopleSelector(!showPeopleSelector)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-left flex items-center justify-between"
          >
            {selectedPeople.length > 0 ? (
              <span className="text-[#5B2D7D]">
                {selectedPeople
                  .map((id) => people.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ) : (
              <span className="text-[#5B2D7D]/30">Select people</span>
            )}
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
              className="mt-2 p-3 bg-white rounded-xl border border-[#5B2D7D]/10 space-y-2"
            >
              {people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between ${
                    selectedPeople.includes(person.id)
                      ? "bg-[#5B2D7D] text-white"
                      : "hover:bg-[#EADDDE]/50 text-[#5B2D7D]"
                  }`}
                >
                  {person.name}
                  {selectedPeople.includes(person.id) && <span>✓</span>}
                </button>
              ))}

              <div className="flex gap-2 pt-2 border-t border-[#5B2D7D]/10">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Add someone new..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#EADDDE]/30 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                />
                <button
                  onClick={handleAddPerson}
                  disabled={!newPersonName.trim() || isAddingPerson}
                  className="px-3 py-2 bg-[#5B2D7D] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isAddingPerson ? "..." : "Add"}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Reflection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#5B2D7D]/60 mb-2">
            <Sparkles className="w-4 h-4" />
            How was it? (optional)
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Share your thoughts and feelings about this experience..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none focus:border-[#5B2D7D]/30 resize-none"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#5B2D7D]/60 mb-2">
            <ImageIcon className="w-4 h-4" />
            Photos & Videos (optional)
          </label>

          {/* Media Grid */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {media.map((m, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden bg-[#EADDDE] relative"
                >
                  {m.status === "uploading" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-[#5B2D7D] border-t-transparent rounded-full" />
                    </div>
                  ) : m.status === "error" ? (
                    <div className="w-full h-full flex items-center justify-center text-red-500">
                      <X className="w-6 h-6" />
                    </div>
                  ) : m.type === "image" ? (
                    <img
                      src={m.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={m.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
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
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-[#5B2D7D]/20 rounded-xl flex items-center justify-center gap-2 text-[#5B2D7D]/60 hover:border-[#5B2D7D]/40 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Add photos or videos</span>
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12">
        <button
          onClick={handleSubmit}
          disabled={!date || isPending}
          className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors disabled:opacity-50"
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
