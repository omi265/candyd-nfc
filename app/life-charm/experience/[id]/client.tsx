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
} from "lucide-react";
import { Experience, ExperienceMedia, LifeListItem, Person } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/media-helper";

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

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#5B2D7D]/10">
        <button
          onClick={() =>
            router.push(`/life-charm/item/${experience.itemId}?charmId=${charmId}`)
          }
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#5B2D7D]">Your Experience</h1>
          <p className="text-sm text-[#5B2D7D]/60 line-clamp-1">
            {experience.item.title}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto space-y-6">
        {/* Reflection */}
        {experience.reflection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex gap-3">
              <Quote className="w-6 h-6 text-[#A4C538] shrink-0" />
              <p className="text-[#5B2D7D] italic leading-relaxed">
                {experience.reflection}
              </p>
            </div>
          </motion.div>
        )}

        {/* Meta Info */}
        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-center gap-3 text-[#5B2D7D]/70">
            <Calendar className="w-5 h-5" />
            <span>{new Date(experience.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</span>
          </div>

          {/* Location */}
          {experience.location && (
            <div className="flex items-center gap-3 text-[#5B2D7D]/70">
              <MapPin className="w-5 h-5" />
              <span>{experience.location}</span>
            </div>
          )}

          {/* People */}
          {experience.peopleIds.length > 0 && (
            <div className="flex items-start gap-3 text-[#5B2D7D]/70">
              <Users className="w-5 h-5 mt-0.5" />
              <div className="flex flex-wrap gap-2">
                {experience.peopleIds.map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1 bg-[#EADDDE]/50 rounded-full text-sm"
                  >
                    {getPersonName(id)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Media Gallery */}
        {experience.media.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-[#5B2D7D]/60 mb-3">
              Memories
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {experience.media.map((media, index) => (
                <motion.button
                  key={media.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openLightbox(index)}
                  className={`aspect-square rounded-xl overflow-hidden bg-[#EADDDE] ${
                    index === 0 && experience.media.length >= 3
                      ? "col-span-2 aspect-video"
                      : ""
                  }`}
                >
                  {media.type === "image" ? (
                    <img
                      src={getOptimizedUrl(media.url, "image", 600)}
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
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between p-4">
              <span className="text-white/60 text-sm">
                {selectedMediaIndex + 1} / {experience.media.length}
              </span>
              <button
                onClick={closeLightbox}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
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
                    className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={nextMedia}
                    className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedMediaIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-full max-h-full"
                >
                  {experience.media[selectedMediaIndex].type === "image" ? (
                    <img
                      src={experience.media[selectedMediaIndex].url}
                      alt=""
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    />
                  ) : experience.media[selectedMediaIndex].type === "video" ? (
                    <video
                      src={experience.media[selectedMediaIndex].url}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      controls
                      autoPlay
                    />
                  ) : (
                    <div className="w-64 h-64 bg-white/10 rounded-2xl flex items-center justify-center">
                      <span className="text-6xl">🎵</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
