"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  GraduationCap,
  Check,
  Circle,
  ChevronRight,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
} from "lucide-react";
import { motion } from "motion/react";
import { getOptimizedUrl } from "@/lib/media-helper";

interface LifeCharmDrawerProps {
  lifeCharm: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people?: any[];
}

export function LifeCharmDrawer({
  lifeCharm,
  open,
  onOpenChange,
  people = [],
}: LifeCharmDrawerProps) {
  const router = useRouter();

  const lifeList = lifeCharm?.lifeLists?.[0];
  const items = lifeList?.items || [];
  const isGraduated = lifeCharm?.state === "GRADUATED";

  // Stats - must be called unconditionally (before any early return)
  const stats = useMemo(() => {
    const total = items.length;
    const lived = items.filter((i: any) => i.status === "lived").length;
    const pending = items.filter((i: any) => i.status === "pending").length;
    const percentage = total > 0 ? Math.round((lived / total) * 100) : 0;
    return { total, lived, pending, percentage };
  }, [items]);

  // Sort items: lived first, then pending - must be called unconditionally
  const sortedItems = useMemo(() => {
    return [...items].sort((a: any, b: any) => {
      if (a.status === "lived" && b.status !== "lived") return -1;
      if (a.status !== "lived" && b.status === "lived") return 1;
      return 0;
    });
  }, [items]);

  // Get person name by ID
  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || "Unknown";
  };

  const handleViewFullList = () => {
    onOpenChange(false);
    router.push(`/life-charm?charmId=${lifeCharm?.id}`);
  };

  const handleAddItem = () => {
    onOpenChange(false);
    router.push(`/life-charm/add?charmId=${lifeCharm?.id}`);
  };

  const handleItemClick = (item: any) => {
    onOpenChange(false);
    // If lived, go directly to experience page; otherwise go to item detail
    if (item.status === "lived") {
      router.push(`/life-charm/experience/${item.id}?charmId=${lifeCharm?.id}`);
    } else {
      router.push(`/life-charm/item/${item.id}?charmId=${lifeCharm?.id}`);
    }
  };

  // Early return after all hooks are called
  if (!lifeCharm) return null;

  // Show only first 5 items in drawer
  const displayItems = sortedItems.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#FDF2EC]/45 backdrop-blur-xl border-t border-white/30 max-h-[96vh] h-full rounded-t-[32px] font-[Outfit]">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <DrawerHeader className="p-0">
            <DrawerTitle className="sr-only">
              {lifeList?.name || lifeCharm.name || "Life Charm"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Your bucket list details
            </DrawerDescription>

            {/* Header Content */}
            <div className="pt-6 px-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#5B2D7D]/10 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-[#5B2D7D]" />
                    </div>
                    <span className="text-xs font-medium text-[#5B2D7D]/60 uppercase tracking-wide">
                      Life Charm
                    </span>
                  </div>
                  <h1 className="text-[#5B2D7D] text-3xl font-bold leading-tight">
                    {lifeList?.name || lifeCharm.name || "My List"}
                  </h1>
                  {lifeList?.description && (
                    <p className="text-[#5B2D7D]/70 text-sm mt-2 line-clamp-2">
                      {lifeList.description}
                    </p>
                  )}
                </div>

                {isGraduated && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#A4C538]/20 rounded-full shrink-0">
                    <GraduationCap className="w-4 h-4 text-[#A4C538]" />
                    <span className="text-sm font-medium text-[#5B2D7D]">
                      Graduated
                    </span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-[#A4C538]">
                    {stats.lived}
                  </span>
                  <span className="text-lg text-[#5B2D7D]/60 pb-1">
                    / {stats.total}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#5B2D7D]/60 uppercase tracking-wide">
                    Experiences
                  </span>
                  <span className="text-xs text-[#5B2D7D]/60">Lived</span>
                </div>
                <div className="ml-auto text-2xl font-bold text-[#5B2D7D]">
                  {stats.percentage}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-5 bg-[#EADDDE] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#A4C538] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </DrawerHeader>

          {/* Items List */}
          <div className="px-6 mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="w-12 h-12 text-[#5B2D7D]/20 mb-4" />
                <p className="text-[#5B2D7D]/60 text-sm">
                  Your list is empty. Start adding experiences!
                </p>
              </div>
            ) : (
              <>
                {displayItems.map((item: any) => (
                  <ListItemCard
                    key={item.id}
                    item={item}
                    getPersonName={getPersonName}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </>
            )}
          </div>

          <DrawerFooter className="px-6 mt-6 pb-8 space-y-3">
            {!isGraduated && (
              <button
                onClick={handleAddItem}
                className="w-full bg-[#A4C538] py-4 rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm shadow-lg hover:bg-[#95b330] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add to list
              </button>
            )}

            <button
              onClick={handleViewFullList}
              className="w-full bg-[#5B2D7D] py-4 rounded-full flex items-center justify-center gap-2 text-white font-bold text-sm shadow-lg hover:bg-[#4a2466] transition-colors"
            >
              View full list
              <ArrowRight className="w-5 h-5" />
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// List Item Card Component
function ListItemCard({
  item,
  getPersonName,
  onClick,
}: {
  item: any;
  getPersonName: (id: string) => string;
  onClick: () => void;
}) {
  const isLived = item.status === "lived";
  const hasMedia = item.experience?.media && item.experience.media.length > 0;
  const firstMedia = hasMedia ? item.experience.media[0] : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div
          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            isLived ? "bg-[#A4C538]" : "border-2 border-[#5B2D7D]/30"
          }`}
        >
          {isLived ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <Circle className="w-3 h-3 text-[#5B2D7D]/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-[#5B2D7D] text-sm ${
              isLived ? "line-through opacity-60" : ""
            }`}
          >
            {item.title}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Show experience people for lived items, otherwise item people */}
            {isLived && item.experience?.peopleIds && item.experience.peopleIds.length > 0 ? (
              <div className="flex items-center gap-1 text-[10px] text-white font-medium bg-[#5B2D7D] px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" />
                <span>
                  {item.experience.peopleIds
                    .slice(0, 2)
                    .map((id: string) => getPersonName(id))
                    .join(", ")}
                  {item.experience.peopleIds.length > 2 && ` +${item.experience.peopleIds.length - 2}`}
                </span>
              </div>
            ) : item.peopleIds && item.peopleIds.length > 0 ? (
              <div className="flex items-center gap-1 text-[10px] text-[#5B2D7D] bg-[#5B2D7D]/10 px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" />
                <span>
                  {item.peopleIds
                    .slice(0, 2)
                    .map((id: string) => getPersonName(id))
                    .join(", ")}
                  {item.peopleIds.length > 2 && ` +${item.peopleIds.length - 2}`}
                </span>
              </div>
            ) : null}

            {isLived && item.livedAt && (
              <div className="flex items-center gap-1 text-[10px] text-[#A4C538] font-medium bg-[#A4C538]/10 px-2 py-0.5 rounded-full">
                <Calendar className="w-3 h-3" />
                {new Date(item.livedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail or Chevron */}
        <div className="shrink-0">
          {hasMedia && firstMedia ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden">
              {firstMedia.type === "image" ? (
                <img
                  src={getOptimizedUrl(firstMedia.url, "image", 96)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : firstMedia.type === "video" ? (
                <video
                  src={firstMedia.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <div className="w-full h-full bg-[#EADDDE] flex items-center justify-center">
                  <span className="text-lg">🎵</span>
                </div>
              )}
            </div>
          ) : (
            <ChevronRight className="w-5 h-5 text-[#5B2D7D]/30" />
          )}
        </div>
      </div>
    </button>
  );
}
