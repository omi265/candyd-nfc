"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, Plus, ArrowRight, Check } from "lucide-react";
import { CURATED_TEMPLATES, LifeListTemplate } from "@/lib/life-list-templates";
import { createLifeList } from "@/app/actions/life-charm";
import { toast } from "sonner";

export default function LifeCharmSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get("charmId");

  const [selectedTemplate, setSelectedTemplate] = useState<LifeListTemplate | null>(null);
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!charmId) {
    router.push("/");
    return null;
  }

  const handleSelectTemplate = (template: LifeListTemplate) => {
    setSelectedTemplate(template);
    setShowCustom(false);
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate(null);
    setShowCustom(true);
  };

  const handleCreate = () => {
    startTransition(async () => {
      const name = showCustom
        ? customName.trim() || "My Life List"
        : selectedTemplate?.name || "My Life List";

      const result = await createLifeList(charmId, {
        name,
        description: selectedTemplate?.description,
        template: selectedTemplate?.id,
        items: selectedTemplate?.items,
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
      <header className="px-6 pt-8 pb-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-[#E8DCF0] rounded-full flex items-center justify-center mx-auto mb-4"
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
          Choose a template or start from scratch
        </motion.p>
      </header>

      {/* Templates Grid */}
      <div className="flex-1 px-6 overflow-y-auto pb-32">
        <div className="grid grid-cols-1 gap-4">
          {CURATED_TEMPLATES.map((template, index) => (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onClick={() => handleSelectTemplate(template)}
              className={`w-full text-left p-4 rounded-2xl transition-all ${
                selectedTemplate?.id === template.id
                  ? "bg-[#5B2D7D] text-white shadow-lg scale-[1.02]"
                  : "bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{template.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-semibold ${
                        selectedTemplate?.id === template.id
                          ? "text-white"
                          : "text-[#5B2D7D]"
                      }`}
                    >
                      {template.name}
                    </h3>
                    {selectedTemplate?.id === template.id && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${
                      selectedTemplate?.id === template.id
                        ? "text-white/80"
                        : "text-[#5B2D7D]/60"
                    }`}
                  >
                    {template.description}
                  </p>
                  <p
                    className={`text-xs mt-2 ${
                      selectedTemplate?.id === template.id
                        ? "text-white/60"
                        : "text-[#5B2D7D]/40"
                    }`}
                  >
                    {template.items.length} items
                  </p>
                </div>
              </div>
            </motion.button>
          ))}

          {/* Start from scratch option */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + CURATED_TEMPLATES.length * 0.05 }}
            onClick={handleStartFromScratch}
            className={`w-full text-left p-4 rounded-2xl border-2 border-dashed transition-all ${
              showCustom
                ? "border-[#5B2D7D] bg-[#5B2D7D]/5"
                : "border-[#5B2D7D]/20 hover:border-[#5B2D7D]/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  showCustom ? "bg-[#5B2D7D]" : "bg-[#EADDDE]"
                }`}
              >
                <Plus
                  className={`w-6 h-6 ${
                    showCustom ? "text-white" : "text-[#5B2D7D]"
                  }`}
                />
              </div>
              <div>
                <h3 className="font-semibold text-[#5B2D7D]">
                  Start from scratch
                </h3>
                <p className="text-sm text-[#5B2D7D]/60">
                  Create your own custom list
                </p>
              </div>
            </div>
          </motion.button>

          {/* Custom name input */}
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name your list..."
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/20 text-[#5B2D7D] placeholder-[#5B2D7D]/40 outline-none focus:border-[#5B2D7D] transition-colors"
                autoFocus
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      {(selectedTemplate || showCustom) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12"
        >
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors disabled:opacity-50"
          >
            {isPending ? (
              "Creating..."
            ) : (
              <>
                Get started
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
