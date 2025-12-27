"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Check,
  Clock,
  Trophy,
} from "lucide-react";
import {
  getLifeCharmStats,
  graduateCharm,
  reopenCharm,
  getProductById,
} from "@/app/actions/life-charm";
import { toast } from "sonner";

export default function GraduatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get("charmId");

  const [stats, setStats] = useState<{
    total: number;
    lived: number;
    pending: number;
    skipped: number;
    percentComplete: number;
  } | null>(null);
  const [isGraduated, setIsGraduated] = useState(false);
  const [productName, setProductName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!charmId) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      const [statsData, product] = await Promise.all([
        getLifeCharmStats(charmId),
        getProductById(charmId),
      ]);

      if (!statsData || !product) {
        router.push(`/life-charm?charmId=${charmId}`);
        return;
      }

      setStats(statsData);
      setIsGraduated(product.state === "GRADUATED");
      setProductName(product.name);
    };

    fetchData();
  }, [charmId, router]);

  const handleGraduate = () => {
    if (!charmId) return;

    startTransition(async () => {
      const result = await graduateCharm(charmId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Chapter closed!");
        setIsGraduated(true);
        setShowConfirm(false);
      }
    });
  };

  const handleReopen = () => {
    if (!charmId) return;

    startTransition(async () => {
      const result = await reopenCharm(charmId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Chapter reopened!");
        setIsGraduated(false);
      }
    });
  };

  if (!charmId || !stats) {
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
          onClick={() => router.push(`/life-charm?charmId=${charmId}`)}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
        </button>
        <h1 className="text-xl font-bold text-[#5B2D7D]">
          {isGraduated ? "Chapter Complete" : "Close Chapter"}
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isGraduated ? "bg-[#A4C538]" : "bg-[#E8DCF0]"
          }`}
        >
          {isGraduated ? (
            <Trophy className="w-12 h-12 text-white" />
          ) : (
            <GraduationCap className="w-12 h-12 text-[#5B2D7D]" />
          )}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-[#5B2D7D] mb-2">
            {isGraduated
              ? "This chapter is complete!"
              : "Ready to close this chapter?"}
          </h2>
          <p className="text-[#5B2D7D]/60">
            {isGraduated
              ? `"${productName}" has been graduated`
              : "Graduation marks the end of a beautiful season"}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-6"
        >
          <h3 className="text-sm font-medium text-[#5B2D7D]/60 mb-4">
            Your Journey
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#A4C538]">
                {stats.lived}
              </div>
              <div className="text-xs text-[#5B2D7D]/60">Lived</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#5B2D7D]/40">
                {stats.pending}
              </div>
              <div className="text-xs text-[#5B2D7D]/60">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#5B2D7D]">
                {stats.total}
              </div>
              <div className="text-xs text-[#5B2D7D]/60">Total</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-[#EADDDE] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#A4C538] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.percentComplete}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-center text-sm text-[#5B2D7D]/60 mt-2">
            {stats.percentComplete}% complete
          </p>
        </motion.div>

        {/* Info Box */}
        {!isGraduated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#FBE0D6]/50 rounded-2xl p-4 mb-6"
          >
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-[#F37B55] shrink-0 mt-0.5" />
              <div className="text-sm text-[#5B2D7D]/70">
                <p className="font-medium text-[#5B2D7D] mb-1">
                  What happens when you graduate?
                </p>
                <ul className="space-y-1">
                  <li>• Your list becomes read-only</li>
                  <li>• All your experiences are preserved</li>
                  <li>• You can reopen anytime if needed</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-6 space-y-3">
        {isGraduated ? (
          <button
            onClick={handleReopen}
            disabled={isPending}
            className="w-full py-4 bg-white border-2 border-[#5B2D7D]/20 text-[#5B2D7D] rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:border-[#5B2D7D]/40 transition-colors disabled:opacity-50"
          >
            {isPending ? "Reopening..." : "Reopen this chapter"}
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors"
          >
            <GraduationCap className="w-5 h-5" />
            Graduate
          </button>
        )}

        <button
          onClick={() => router.push(`/life-charm?charmId=${charmId}`)}
          className="w-full py-3 text-[#5B2D7D]/60 font-medium"
        >
          Back to list
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-[#5B2D7D]" />
            </div>
            <h3 className="text-lg font-bold text-[#5B2D7D] text-center mb-2">
              Close this chapter?
            </h3>
            <p className="text-[#5B2D7D]/60 text-center mb-6">
              {stats.pending > 0
                ? `You still have ${stats.pending} pending items. You can always reopen later.`
                : "You've lived all your experiences! Time to celebrate."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-[#EADDDE] text-[#5B2D7D] rounded-xl font-medium"
              >
                Not yet
              </button>
              <button
                onClick={handleGraduate}
                disabled={isPending}
                className="flex-1 py-3 bg-[#A4C538] text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isPending ? "..." : "Graduate"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
