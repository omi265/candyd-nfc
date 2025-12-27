"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  X,
  Check,
  Circle,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { LifeList, LifeListItem, Product, Person, Experience, ExperienceMedia } from "@prisma/client";
import { getOptimizedUrl } from "@/lib/media-helper";

type LifeListItemWithExperience = LifeListItem & {
  experience: (Experience & { media: ExperienceMedia[] }) | null;
};

type LifeListWithItems = LifeList & {
  items: LifeListItemWithExperience[];
};

type ProductWithState = Product & {
  state: string;
};

interface LifeCharmContentProps {
  lifeList: LifeListWithItems;
  product: ProductWithState;
  people: Person[];
  user: { id?: string; name?: string | null; email?: string | null };
}

type FilterType = "all" | "pending" | "lived";

export default function LifeCharmContent({
  lifeList,
  product,
  people,
  user,
}: LifeCharmContentProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isGraduated = product.state === "GRADUATED";

  // Filter items based on selected filter and search
  const filteredItems = useMemo(() => {
    let items = lifeList.items;

    // Filter by status
    if (filter === "pending") {
      items = items.filter((item) => item.status === "pending");
    } else if (filter === "lived") {
      items = items.filter((item) => item.status === "lived");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [lifeList.items, filter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = lifeList.items.length;
    const lived = lifeList.items.filter((i) => i.status === "lived").length;
    const pending = lifeList.items.filter((i) => i.status === "pending").length;
    return { total, lived, pending };
  }, [lifeList.items]);

  // Get person name by ID
  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || "Unknown";
  };

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-[#5B2D7D]">
              {lifeList.name}
            </h1>
            <p className="text-sm text-[#5B2D7D]/60">
              {stats.lived} of {stats.total} lived
            </p>
          </div>
          {isGraduated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#A4C538]/20 rounded-full">
              <GraduationCap className="w-4 h-4 text-[#A4C538]" />
              <span className="text-sm font-medium text-[#5B2D7D]">
                Graduated
              </span>
            </div>
          ) : (
            <button
              onClick={() =>
                router.push(`/life-charm/graduate?charmId=${product.id}`)
              }
              className="text-sm text-[#5B2D7D]/60 hover:text-[#5B2D7D] transition-colors"
            >
              Graduate
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-[#EADDDE] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#A4C538] rounded-full"
            initial={{ width: 0 }}
            animate={{
              width:
                stats.total > 0
                  ? `${(stats.lived / stats.total) * 100}%`
                  : "0%",
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-6 py-3 overflow-x-auto no-scrollbar">
        {/* Search */}
        <div
          className={`shrink-0 rounded-full bg-white shadow-sm flex items-center transition-all duration-300 overflow-hidden h-10 ${
            isSearchOpen ? "w-48 px-4" : "w-10 justify-center"
          }`}
        >
          {isSearchOpen ? (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-full bg-transparent outline-none text-[#5B2D7D] text-sm placeholder-[#5B2D7D]/40 min-w-0"
                autoFocus
                onBlur={() => !searchQuery && setIsSearchOpen(false)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="ml-2">
                  <X className="w-4 h-4 text-[#5B2D7D]/60" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full h-full flex items-center justify-center"
            >
              <Search className="w-5 h-5 text-[#5B2D7D]" />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        {(["all", "pending", "lived"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap shadow-sm transition-colors ${
              filter === f
                ? "bg-[#5B2D7D] text-white"
                : "bg-white text-[#5B2D7D] hover:bg-[#EADDDE]"
            }`}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending" : "Lived"}
            {f === "all" && ` (${stats.total})`}
            {f === "pending" && ` (${stats.pending})`}
            {f === "lived" && ` (${stats.lived})`}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Sparkles className="w-12 h-12 text-[#5B2D7D]/20 mb-4" />
              <p className="text-[#5B2D7D]/60">
                {searchQuery
                  ? "No items match your search"
                  : filter === "pending"
                  ? "No pending items"
                  : filter === "lived"
                  ? "No lived experiences yet"
                  : "Your list is empty"}
              </p>
              {!isGraduated && filter === "all" && !searchQuery && (
                <button
                  onClick={() =>
                    router.push(`/life-charm/add?charmId=${product.id}`)
                  }
                  className="mt-4 px-4 py-2 bg-[#5B2D7D] text-white rounded-full text-sm font-medium"
                >
                  Add your first item
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItemCard
                    item={item}
                    people={people}
                    getPersonName={getPersonName}
                    onClick={() =>
                      item.status === "lived"
                        ? router.push(`/life-charm/experience/${item.id}?charmId=${product.id}`)
                        : router.push(`/life-charm/item/${item.id}?charmId=${product.id}`)
                    }
                    isGraduated={isGraduated}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Button */}
      {!isGraduated && (
        <div className="sticky bottom-0 p-6 pt-4">
          <button
            onClick={() =>
              router.push(`/life-charm/add?charmId=${product.id}`)
            }
            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add to list
          </button>
        </div>
      )}
    </div>
  );
}

// List Item Card Component
interface ListItemCardProps {
  item: LifeListItemWithExperience;
  people: Person[];
  getPersonName: (id: string) => string;
  onClick: () => void;
  isGraduated: boolean;
}

function ListItemCard({
  item,
  people,
  getPersonName,
  onClick,
  isGraduated,
}: ListItemCardProps) {
  const isLived = item.status === "lived";
  const hasMedia = item.experience?.media && item.experience.media.length > 0;
  const firstMedia = hasMedia ? item.experience!.media[0] : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div
          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            isLived
              ? "bg-[#A4C538]"
              : "border-2 border-[#5B2D7D]/30"
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
            className={`font-semibold text-[#5B2D7D] ${
              isLived ? "line-through opacity-60" : ""
            }`}
          >
            {item.title}
          </h3>

          {item.description && (
            <p className="text-sm text-[#5B2D7D]/60 line-clamp-2 mt-0.5">
              {item.description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* People tags */}
            {item.peopleIds.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#5B2D7D]/60 bg-[#EADDDE]/50 px-2 py-1 rounded-full">
                <span>with</span>
                <span className="font-medium">
                  {item.peopleIds
                    .slice(0, 2)
                    .map((id) => getPersonName(id))
                    .join(", ")}
                  {item.peopleIds.length > 2 &&
                    ` +${item.peopleIds.length - 2}`}
                </span>
              </div>
            )}

            {/* When tag */}
            {item.whenType && (
              <div className="text-xs text-[#5B2D7D]/60 bg-[#FBE0D6]/50 px-2 py-1 rounded-full">
                {item.whenType === "someday"
                  ? "Someday"
                  : item.whenType === "this_year"
                  ? "This year"
                  : item.whenType === "this_month"
                  ? "This month"
                  : item.targetDate
                  ? new Date(item.targetDate).toLocaleDateString()
                  : ""}
              </div>
            )}

            {/* Lived date */}
            {isLived && item.livedAt && (
              <div className="text-xs text-[#A4C538] font-medium bg-[#A4C538]/10 px-2 py-1 rounded-full">
                Lived {new Date(item.livedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail or Chevron */}
        <div className="shrink-0">
          {hasMedia && firstMedia ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden">
              {firstMedia.type === "image" ? (
                <img
                  src={getOptimizedUrl(firstMedia.url, "image", 128)}
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
                  <span className="text-2xl">🎵</span>
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
