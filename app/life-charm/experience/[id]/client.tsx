"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  Quote,
  Sparkles,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { Experience, ExperienceMedia, LifeListItem, Person } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/media-helper";
import AudioPlayer from "@/app/components/AudioPlayer";

type ExperienceWithRelations = Experience & {
  media: ExperienceMedia[];
  item: LifeListItem & {
    lifeList: { userId: string; productId: string };
  };
};

interface ExperienceClientProps {
  experience: ExperienceWithRelations;
  people: Person[];
  charmId: string;
}

export default function ExperienceClient({
  experience,
  people,
  charmId,
}: ExperienceClientProps) {
  const router = useRouter();
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || "Unknown";
  };

  const openLightbox = (index: number) => {
    setSelectedMediaIndex(index);
  };

  const closeLightbox = () => {
    setSelectedMediaIndex(null);
  };

  const nextMedia = () => {
    if (selectedMediaIndex !== null && experience.media.length > 0) {
      setSelectedMediaIndex((prev) =>
        prev !== null ? (prev + 1) % experience.media.length : 0
      );
    }
  };

  const prevMedia = () => {
    if (selectedMediaIndex !== null && experience.media.length > 0) {
      setSelectedMediaIndex((prev) =>
        prev !== null
          ? (prev - 1 + experience.media.length) % experience.media.length
          : 0
      );
    }
  };

  const hasMedia = experience.media.length > 0;

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FDF2EC]/80 backdrop-blur-xl border-b border-[#5B2D7D]/5">
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push(`/life-charm?charmId=${charmId}`)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-4 h-4 text-[#A4C538]" />
              <span className="text-xs font-medium text-[#A4C538] uppercase tracking-wide">
                Experience
              </span>
            </div>
            <h1 className="text-lg font-bold text-[#5B2D7D] truncate">
              {experience.item.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Info Section */}
        <div className="px-6 pt-6">
          {/* Date & Location Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <Calendar className="w-4 h-4 text-[#5B2D7D]" />
              <span className="text-sm text-[#5B2D7D] font-medium">
                {new Date(experience.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {experience.location && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm">
                <MapPin className="w-4 h-4 text-[#5B2D7D]" />
                <span className="text-sm text-[#5B2D7D] font-medium">
                  {experience.location}
                </span>
              </div>
            )}
          </div>

          {/* People */}
          {experience.peopleIds.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-4 h-4 text-[#5B2D7D]" />
              <div className="flex flex-wrap gap-1.5">
                {experience.peopleIds.map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1 bg-[#5B2D7D] rounded-full text-xs text-white font-medium"
                  >
                    {getPersonName(id)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reflection */}
          {experience.reflection && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] p-5 shadow-sm mb-6"
            >
              <div className="flex gap-3">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#A4C538]/10 flex items-center justify-center">
                    <Quote className="w-4 h-4 text-[#A4C538]" />
                  </div>
                </div>
                <p className="text-[#5B2D7D] leading-relaxed italic flex-1">
                  "{experience.reflection}"
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Media List */}
        <div className="px-6 space-y-4">
          {hasMedia ? (
            experience.media.map((media, index) => (
              <motion.div
                key={media.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                {media.type === "image" && (
                  <button
                    onClick={() => openLightbox(index)}
                    className="w-full bg-white p-3 rounded-[32px] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square rounded-[24px] overflow-hidden bg-[#FDF2EC]">
                      <img
                        src={getOptimizedUrl(media.url, "image", 600)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                )}

                {media.type === "video" && (
                  <div className="bg-white p-3 rounded-[32px] shadow-sm">
                    <div className="relative aspect-video rounded-[24px] overflow-hidden bg-black">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      />
                    </div>
                  </div>
                )}

                {media.type === "audio" && (
                  <div className="bg-[#FFF5F0] p-4 rounded-[24px] shadow-sm border border-[#EADDDE]">
                    <AudioPlayer src={media.url} />
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="w-full aspect-square rounded-[32px] bg-[#FFF5F0] border-2 border-dashed border-[#EADDDE] flex flex-col items-center justify-center text-[#A68CAB] gap-2">
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm font-medium">No media added yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedMediaIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
              <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                {selectedMediaIndex + 1} / {experience.media.length}
              </span>
              <button
                onClick={closeLightbox}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
              {experience.media.length > 1 && (
                <>
                  <button
                    onClick={prevMedia}
                    className="absolute left-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={nextMedia}
                    className="absolute right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedMediaIndex}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-full"
                >
                  {experience.media[selectedMediaIndex].type === "image" ? (
                    <img
                      src={experience.media[selectedMediaIndex].url}
                      alt=""
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                    />
                  ) : experience.media[selectedMediaIndex].type === "video" ? (
                    <video
                      src={experience.media[selectedMediaIndex].url}
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                      controls
                      autoPlay
                    />
                  ) : (
                    <div className="w-72 h-72 bg-gradient-to-br from-[#5B2D7D] to-[#3d1d54] rounded-3xl flex flex-col items-center justify-center">
                      <span className="text-7xl mb-4">🎵</span>
                      <span className="text-white/80 font-medium">Audio File</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Thumbnail Strip */}
            {experience.media.length > 1 && (
              <div className="p-4 flex justify-center gap-2 overflow-x-auto">
                {experience.media.map((media, index) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all ${
                      index === selectedMediaIndex
                        ? "ring-2 ring-white scale-110"
                        : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    {media.type === "image" ? (
                      <img
                        src={getOptimizedUrl(media.url, "image", 100)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : media.type === "video" ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full bg-[#5B2D7D] flex items-center justify-center">
                        <span className="text-lg">🎵</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
