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
  Image as ImageIcon,
} from "lucide-react";
import { LifeListItem, Person, Experience, ExperienceMedia } from "@prisma/client";
import { updateListItem, deleteListItem } from "@/app/actions/life-charm";
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

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#5B2D7D]/10">
        <button
          onClick={() => router.push(`/life-charm?charmId=${charmId}`)}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
        </button>
        <div className="flex gap-2">
          {!isLived && (
            <button
              onClick={() =>
                router.push(`/life-charm/edit/${item.id}?charmId=${charmId}`)
              }
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
            >
              <Edit2 className="w-5 h-5 text-[#5B2D7D]" />
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto pb-32">
        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isLived ? "bg-[#A4C538]" : "border-2 border-[#5B2D7D]/30"
            }`}
          >
            {isLived ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Circle className="w-4 h-4 text-[#5B2D7D]/30" />
            )}
          </div>
          <span
            className={`text-sm font-medium ${
              isLived ? "text-[#A4C538]" : "text-[#5B2D7D]/60"
            }`}
          >
            {isLived ? "Lived" : "Pending"}
          </span>
          {isLived && item.livedAt && (
            <span className="text-sm text-[#5B2D7D]/40">
              on {new Date(item.livedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#5B2D7D] mb-2">{item.title}</h1>

        {/* Description */}
        {item.description && (
          <p className="text-[#5B2D7D]/70 mb-6">{item.description}</p>
        )}

        {/* Meta Info */}
        <div className="space-y-4 mb-8">
          {/* People */}
          {item.peopleIds.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#5B2D7D]/40 mt-0.5" />
              <div>
                <p className="text-sm text-[#5B2D7D]/60 mb-1">With</p>
                <div className="flex flex-wrap gap-2">
                  {item.peopleIds.map((id) => (
                    <span
                      key={id}
                      className="px-3 py-1 bg-[#EADDDE]/50 rounded-full text-sm text-[#5B2D7D]"
                    >
                      {getPersonName(id)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* When */}
          {item.whenType && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#5B2D7D]/40 mt-0.5" />
              <div>
                <p className="text-sm text-[#5B2D7D]/60 mb-1">When</p>
                <span className="text-[#5B2D7D]">
                  {WHEN_LABELS[item.whenType] || item.whenType}
                  {item.whenType === "specific_date" && item.targetDate && (
                    <span className="ml-2 text-[#5B2D7D]/60">
                      ({new Date(item.targetDate).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Experience Section (if lived) */}
        {isLived && hasExperience && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#A4C538]" />
              <h2 className="font-semibold text-[#5B2D7D]">Your Experience</h2>
            </div>

            {/* Reflection */}
            {item.experience?.reflection && (
              <p className="text-[#5B2D7D]/70 mb-4 italic">
                "{item.experience.reflection}"
              </p>
            )}

            {/* Experience meta */}
            <div className="space-y-2 mb-4">
              {item.experience?.location && (
                <div className="flex items-center gap-2 text-sm text-[#5B2D7D]/60">
                  <MapPin className="w-4 h-4" />
                  {item.experience.location}
                </div>
              )}
              {item.experience?.peopleIds &&
                item.experience.peopleIds.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#5B2D7D]/60">
                    <Users className="w-4 h-4" />
                    With{" "}
                    {item.experience.peopleIds
                      .map((id) => getPersonName(id))
                      .join(", ")}
                  </div>
                )}
            </div>

            {/* Media Preview */}
            {item.experience?.media && item.experience.media.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {item.experience.media.slice(0, 3).map((media, index) => (
                  <div
                    key={media.id}
                    className="aspect-square rounded-xl overflow-hidden bg-[#EADDDE]"
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
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                    )}
                    {index === 2 && item.experience!.media.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold">
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
              className="w-full mt-4 py-3 bg-[#EADDDE]/50 text-[#5B2D7D] rounded-xl font-medium hover:bg-[#EADDDE] transition-colors"
            >
              View full experience
            </button>
          </motion.div>
        )}
      </div>

      {/* Action Button */}
      {!isLived && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12">
          <button
            onClick={handleMarkAsLived}
            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Mark as Lived
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-bold text-[#5B2D7D] mb-2">
              Delete this item?
            </h3>
            <p className="text-[#5B2D7D]/60 mb-6">
              This action cannot be undone.
              {hasExperience &&
                " Any associated experience and media will also be deleted."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-[#EADDDE] text-[#5B2D7D] rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
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
