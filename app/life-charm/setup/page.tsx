"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, Plus, ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react";
import { CURATED_TEMPLATES, LifeListTemplate } from "@/lib/life-list-templates";
import { createLifeList } from "@/app/actions/life-charm";
import { toast } from "sonner";

export default function LifeCharmSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get("charmId");

  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedItemTitles, setSelectedItemTitles] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!charmId) {
    router.push("/");
    return null;
  }

  const toggleTemplate = (templateId: string) => {
    setExpandedTemplateId(expandedTemplateId === templateId ? null : templateId);
  };

  const toggleItem = (title: string) => {
    setSelectedItemTitles(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleStartFromScratch = () => {
    setShowCustom(!showCustom);
    setExpandedTemplateId(null);
  };

  const handleCreate = () => {
    if (selectedItemTitles.length === 0 && !showCustom) {
      toast.error("Please select at least one item or start from scratch");
      return;
    }

    startTransition(async () => {
      const name = customName.trim() || "My Life List";

      const result = await createLifeList(charmId, {
        name,
        description: "A mixed list of experiences",
        items: selectedItemTitles,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Life list created!");
        router.push(`/life-charm?charmId=${charmId}`);
      }
    });
  };

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 text-center shrink-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
        >
          <Sparkles className="w-8 h-8 text-[#5B2D7D]" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-[#5B2D7D] mb-2"
        >
          Start Your Life List
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[#5B2D7D]/60"
        >
          Pick 10-15 experiences from different buckets
        </motion.p>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-40 no-scrollbar">
        {/* List Name Input (Always show or show when items selected) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2 ml-1">
            Name your list
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. My 2026 Adventure"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/20 outline-none focus:border-[#5B2D7D]/30 transition-colors"
          />
        </div>

        <div className="space-y-3">
          {CURATED_TEMPLATES.map((template, index) => {
            const isExpanded = expandedTemplateId === template.id;
            const selectedInTemplate = template.items.filter(item => selectedItemTitles.includes(item)).length;

            return (
              <div key={template.id} className="overflow-hidden">
                <button
                  onClick={() => toggleTemplate(template.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                    isExpanded ? "bg-[#5B2D7D] text-white shadow-md" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.emoji}</span>
                    <div className="text-left">
                      <h3 className="font-bold">{template.name}</h3>
                      {selectedInTemplate > 0 && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isExpanded ? "bg-white/20 text-white" : "bg-[#5B2D7D]/10 text-[#5B2D7D]"
                        }`}>
                          {selectedInTemplate} selected
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-[#5B2D7D]/40" />}
                </button>

                {/* Expanded Items */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-2 bg-white/50 rounded-2xl p-2 space-y-1"
                  >
                    {template.items.map((item) => {
                      const isSelected = selectedItemTitles.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleItem(item)}
                          className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                            isSelected ? "bg-[#5B2D7D]/10" : "hover:bg-[#EADDDE]/30"
                          }`}
                        >
                          <span className={`text-sm ${isSelected ? "text-[#5B2D7D] font-medium" : "text-[#5B2D7D]/70"}`}>
                            {item}
                          </span>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected ? "bg-[#5B2D7D] border-[#5B2D7D]" : "border-[#5B2D7D]/20"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Start from scratch / Add custom option */}
          <button
            onClick={handleStartFromScratch}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all ${
              showCustom ? "border-[#5B2D7D] bg-[#5B2D7D]/5" : "border-[#5B2D7D]/20"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              showCustom ? "bg-[#5B2D7D]" : "bg-[#EADDDE]"
            }`}>
              <Plus className={`w-5 h-5 ${showCustom ? "text-white" : "text-[#5B2D7D]"}`} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-[#5B2D7D]">Add custom items</h3>
              <p className="text-xs text-[#5B2D7D]/60">Start with your own ideas</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sticky Footer */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 z-50 pointer-events-none"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={handleCreate}
            disabled={isPending || (selectedItemTitles.length === 0 && !showCustom)}
            className="w-full py-4 bg-[#A4C538] text-white rounded-[24px] font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:bg-[#93B132] transition-colors disabled:opacity-50"
          >
            {isPending ? (
              "Creating..."
            ) : (
              <>
                Create List
                {selectedItemTitles.length > 0 && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {selectedItemTitles.length} items
                  </span>
                )}
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

