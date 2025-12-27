"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Circle,
  Trash2,
  Edit2,
  Sparkles,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { LifeListItem, Person, Experience, ExperienceMedia } from "@prisma/client";
import { deleteListItem } from "@/app/actions/life-charm";
import { getOptimizedUrl } from "@/lib/media-helper";
import { toast } from "sonner";

type ItemWithExperience = LifeListItem & {
  lifeList: { userId: string; productId: string };
  experience: (Experience & { media: ExperienceMedia[] }) | null;
};

interface ItemDetailClientProps {
  item: ItemWithExperience;
  people: Person[];
  charmId: string;
}

const WHEN_LABELS: Record<string, string> = {
  someday: "Someday",
  this_year: "This Year",
  this_month: "This Month",
  specific_date: "Specific Date",
};

export default function ItemDetailClient({
  item,
  people,
  charmId,
}: ItemDetailClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLived = item.status === "lived";
  const hasExperience = !!item.experience;

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || "Unknown";
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteListItem(item.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Item deleted");
        router.push(`/life-charm?charmId=${charmId}`);
      }
    });
  };

  const handleMarkAsLived = () => {
    router.push(`/life-charm/live/${item.id}?charmId=${charmId}`);
  };

  const handleViewExperience = () => {
    router.push(`/life-charm/experience/${item.id}?charmId=${charmId}`);
  };

  // Get first media for hero background
  const heroMedia = item.experience?.media?.[0];

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Hero Section */}
      <div className="relative">
        {/* Background */}
        <div className={`h-64 relative overflow-hidden ${isLived && heroMedia ? '' : 'bg-gradient-to-br from-[#5B2D7D] to-[#3d1d54]'}`}>
          {isLived && heroMedia ? (
            <>
              {heroMedia.type === "image" ? (
                <img
                  src={getOptimizedUrl(heroMedia.url, "image", 800)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : heroMedia.type === "video" ? (
                <video
                  src={heroMedia.url}
                  className="w-full h-full object-cover"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#5B2D7D] to-[#3d1d54]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#A4C538]/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
            </>
          )}
        </div>

        {/* Header Buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex gap-2">
            {!isLived && (
              <button
                onClick={() =>
                  router.push(`/life-charm/edit/${item.id}?charmId=${charmId}`)
                }
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"
              >
                <Edit2 className="w-5 h-5 text-white" />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Status Badge - Positioned at bottom of hero */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              isLived
                ? "bg-[#A4C538] text-white"
                : "bg-white/20 backdrop-blur-md text-white border border-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isLived ? "bg-white/20" : "border-2 border-white/50"
              }`}
            >
              {isLived ? (
                <Check className="w-3 h-3 text-white" />
              ) : (
                <Circle className="w-2 h-2 text-white/50" />
              )}
            </div>
            <span className="text-sm font-semibold">
              {isLived ? "Lived" : "Pending"}
            </span>
            {isLived && item.livedAt && (
              <span className="text-sm opacity-80">
                • {new Date(item.livedAt).toLocaleDateString()}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 -mt-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-lg p-6 mb-6"
        >
          {/* Title */}
          <h1 className="text-2xl font-bold text-[#5B2D7D] mb-3">{item.title}</h1>

          {/* Description */}
          {item.description && (
            <p className="text-[#5B2D7D]/70 leading-relaxed mb-6">
              {item.description}
            </p>
          )}

          {/* Meta Tags */}
          <div className="flex flex-wrap gap-3">
            {/* People */}
            {item.peopleIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5B2D7D]" />
                <div className="flex flex-wrap gap-1">
                  {item.peopleIds.map((id) => (
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

            {/* When */}
            {item.whenType && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FBE0D6] rounded-full">
                <Calendar className="w-4 h-4 text-[#5B2D7D]" />
                <span className="text-xs text-[#5B2D7D] font-medium">
                  {WHEN_LABELS[item.whenType] || item.whenType}
                  {item.whenType === "specific_date" && item.targetDate && (
                    <span className="ml-1 opacity-70">
                      ({new Date(item.targetDate).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Experience Card (if lived) */}
        {isLived && hasExperience && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-lg overflow-hidden mb-24"
          >
            {/* Experience Header */}
            <div className="bg-gradient-to-r from-[#A4C538] to-[#8fb32e] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <h2 className="font-bold text-white">Your Experience</h2>
              </div>
            </div>

            <div className="p-6">
              {/* Reflection */}
              {item.experience?.reflection && (
                <div className="mb-5">
                  <p className="text-[#5B2D7D] italic text-lg leading-relaxed border-l-4 border-[#A4C538] pl-4">
                    "{item.experience.reflection}"
                  </p>
                </div>
              )}

              {/* Experience Meta */}
              <div className="flex flex-wrap gap-3 mb-5">
                {item.experience?.location && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FDF2EC] rounded-full">
                    <MapPin className="w-4 h-4 text-[#5B2D7D]" />
                    <span className="text-xs text-[#5B2D7D] font-medium">
                      {item.experience.location}
                    </span>
                  </div>
                )}
                {item.experience?.peopleIds &&
                  item.experience.peopleIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#5B2D7D]" />
                      <div className="flex flex-wrap gap-1">
                        {item.experience.peopleIds.map((id) => (
                          <span
                            key={id}
                            className="px-2 py-1 bg-[#5B2D7D] rounded-full text-xs text-white font-medium"
                          >
                            {getPersonName(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Media Preview */}
              {item.experience?.media && item.experience.media.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {item.experience.media.slice(0, 3).map((media, index) => (
                    <div
                      key={media.id}
                      className="aspect-square rounded-2xl overflow-hidden bg-[#EADDDE] relative"
                    >
                      {media.type === "image" ? (
                        <img
                          src={getOptimizedUrl(media.url, "image", 200)}
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
                        <div className="w-full h-full flex items-center justify-center bg-[#5B2D7D]/10">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                      {index === 2 && item.experience!.media.length > 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            +{item.experience!.media.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* View Experience Button */}
              <button
                onClick={handleViewExperience}
                className="w-full py-4 bg-[#FDF2EC] text-[#5B2D7D] rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#EADDDE] transition-colors"
              >
                View full experience
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Empty Experience State for Lived without details */}
        {isLived && !hasExperience && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-lg p-8 text-center mb-24"
          >
            <div className="w-16 h-16 rounded-full bg-[#A4C538]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[#A4C538]" />
            </div>
            <h3 className="text-lg font-bold text-[#5B2D7D] mb-2">
              Experience Complete!
            </h3>
            <p className="text-[#5B2D7D]/60 text-sm">
              You've lived this experience. Great job!
            </p>
          </motion.div>
        )}
      </div>

      {/* Action Button */}
      {!isLived && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 z-30">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleMarkAsLived}
            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#A4C538]/30 hover:bg-[#93B132] transition-colors active:scale-[0.98]"
          >
            <Sparkles className="w-6 h-6" />
            Mark as Lived
          </motion.button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-[#5B2D7D] text-center mb-2">
              Delete this item?
            </h3>
            <p className="text-[#5B2D7D]/60 text-center mb-6">
              This action cannot be undone.
              {hasExperience &&
                " Any associated experience and media will also be deleted."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 bg-[#EADDDE] text-[#5B2D7D] rounded-xl font-semibold hover:bg-[#d4c3d8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
