"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Users, Calendar, ChevronDown, Sparkles, ChevronUp, Check } from "lucide-react";
import { addListItem, getLifeList } from "@/app/actions/life-charm";
import { getPeople, createPerson } from "@/app/actions/people";
import { toast } from "sonner";
import { Person } from "@prisma/client";
import { CURATED_TEMPLATES } from "@/lib/life-list-templates";

const WHEN_OPTIONS = [
  { id: "someday", label: "Someday", description: "When the time feels right" },
  { id: "this_year", label: "This Year", description: "Before the year ends" },
  { id: "this_month", label: "This Month", description: "In the coming weeks" },
  { id: "specific_date", label: "Specific Date", description: "Pick a date" },
];

export default function AddItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charmId = searchParams.get("charmId");

  const [mode, setMode] = useState<'custom' | 'templates'>('custom');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [whenType, setWhenType] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [showWhenSelector, setShowWhenSelector] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [lifeListId, setLifeListId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // Template selection state
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<string[]>([]);

  useEffect(() => {
    if (!charmId) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      const [lifeList, peopleData] = await Promise.all([
        getLifeList(charmId),
        getPeople(),
      ]);

      if (!lifeList) {
        router.push(`/life-charm/setup?charmId=${charmId}`);
        return;
      }

      setLifeListId(lifeList.id);
      setPeople(peopleData);
      
      const count = lifeList.items.filter(item => item.status === "pending").length;
      setPendingCount(count);
    };

    fetchData();
  }, [charmId, router]);

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
      toast.success(`Added ${result.person.name}`);
    }
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const toggleTemplateItem = (title: string) => {
    setSelectedTemplateItems(prev => {
      if (prev.includes(title)) {
        return prev.filter(t => t !== title);
      }
      if (pendingCount + prev.length >= 5) {
        toast.error("You can only have up to 5 unlived experiences.");
        return prev;
      }
      return [...prev, title];
    });
  };

  const handleSubmit = () => {
    if (mode === 'custom') {
      if (!title.trim()) {
        toast.error("Please enter a title");
        return;
      }

      if (!whenType) {
        toast.error("Please select when you'd like to do this");
        return;
      }

      if (whenType === "specific_date" && !targetDate) {
        toast.error("Please select a specific date");
        return;
      }

      if (!lifeListId) {
        toast.error("Life list not found");
        return;
      }

      startTransition(async () => {
        const result = await addListItem(lifeListId, {
          title: title.trim(),
          description: description.trim() || undefined,
          peopleIds: selectedPeople.length > 0 ? selectedPeople : undefined,
          whenType: whenType,
          targetDate: whenType === "specific_date" && targetDate ? targetDate : undefined,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Item added!");
          router.push(`/life-charm?charmId=${charmId}&view=list`);
        }
      });
    } else {
      // Template mode
      if (selectedTemplateItems.length === 0) {
        toast.error("Please select at least one experience");
        return;
      }

      startTransition(async () => {
        // Add all selected template items sequentially
        // For template items, we default to "someday" as they are quick-adds
        for (const itemTitle of selectedTemplateItems) {
          await addListItem(lifeListId!, { 
            title: itemTitle,
            whenType: "someday" 
          });
        }
        toast.success(`Added ${selectedTemplateItems.length} items!`);
        router.push(`/life-charm?charmId=${charmId}&view=list`);
      });
    }
  };

  if (!charmId) return null;

  return (
    <div className="min-h-dvh bg-transparent flex flex-col ">
      {/* Header */}
      <header className="flex flex-col border-b border-[#556B5A]/10 bg-white shrink-0">
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push(`/life-charm?charmId=${charmId}&view=list`)}
            className="w-10 h-10 rounded-full bg-[#F6F2EC] flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-[#556B5A]" />
          </button>
          <h1 className="text-xl font-bold text-[#556B5A]">Add Bucket List Item</h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-6 pb-2">
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${
              mode === 'custom' ? "border-[#556B5A] text-[#556B5A]" : "border-transparent text-[#556B5A]/40"
            }`}
          >
            Custom
          </button>
          <button
            onClick={() => setMode('templates')}
            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${
              mode === 'templates' ? "border-[#556B5A] text-[#556B5A]" : "border-transparent text-[#556B5A]/40"
            }`}
          >
            Browse Buckets
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto pb-32 no-scrollbar">
        {pendingCount >= 5 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-800">Limit reached</p>
              <p className="text-xs text-orange-700/80">You can only have 5 unlived experiences at a time. Mark an item as lived to add more!</p>
            </div>
          </div>
        )}

        {mode === 'custom' ? (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#556B5A]/60 mb-2">
                What do you want to do? *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Watch the sunset together"
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] placeholder-[#556B5A]/30 outline-none focus:border-[#556B5A]/30 transition-colors"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#556B5A]/60 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-[#556B5A] placeholder-[#556B5A]/30 outline-none focus:border-[#556B5A]/30 transition-colors resize-none"
              />
            </div>

            {/* Who */}
            <div>
              <label className="block text-sm font-medium text-[#556B5A]/60 mb-2">
                Who do you want to do this with?
              </label>
              <button
                onClick={() => setShowPeopleSelector(!showPeopleSelector)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#556B5A]/40" />
                  {selectedPeople.length > 0 ? (
                    <span className="text-[#556B5A]">
                      {selectedPeople
                        .map((id) => people.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-[#556B5A]/30">Select people</span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#556B5A]/40 transition-transform ${
                    showPeopleSelector ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* People selector dropdown */}
              {showPeopleSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-white rounded-xl border border-[#556B5A]/10 space-y-2"
                >
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => togglePerson(person.id)}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between ${
                        selectedPeople.includes(person.id)
                          ? "bg-[#556B5A] text-white"
                          : "hover:bg-[#E6DED1]/50 text-[#556B5A]"
                      }`}
                    >
                      {person.name}
                      {selectedPeople.includes(person.id) && (
                        <span className="text-sm">✓</span>
                      )}
                    </button>
                  ))}

                  {/* Add new person */}
                  <div className="flex gap-2 pt-2 border-t border-[#556B5A]/10">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Add someone new..."
                      className="flex-1 px-3 py-2 rounded-lg bg-[#E6DED1]/30 text-[#556B5A] placeholder-[#556B5A]/30 outline-none text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                    />
                    <button
                      onClick={handleAddPerson}
                      disabled={!newPersonName.trim() || isAddingPerson}
                      className="px-3 py-2 bg-[#556B5A] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {isAddingPerson ? "..." : "Add"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* When */}
            <div>
              <label className="block text-sm font-medium text-[#556B5A]/60 mb-2">
                hope to tick this off by
              </label>
              <button
                onClick={() => setShowWhenSelector(!showWhenSelector)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#556B5A]/10 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#556B5A]/40" />
                  {whenType ? (
                    <span className="text-[#556B5A]">
                      {WHEN_OPTIONS.find((o) => o.id === whenType)?.label}
                      {whenType === "specific_date" && targetDate && (
                        <span className="ml-1 text-[#556B5A]/60">
                          ({new Date(targetDate).toLocaleDateString()})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#556B5A]/30">Select timing</span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#556B5A]/40 transition-transform ${
                    showWhenSelector ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* When selector dropdown */}
              {showWhenSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-white rounded-xl border border-[#556B5A]/10 space-y-2"
                >
                  {WHEN_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setWhenType(option.id);
                        if (option.id !== "specific_date") {
                          setShowWhenSelector(false);
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left ${
                        whenType === option.id
                          ? "bg-[#556B5A] text-white"
                          : "hover:bg-[#E6DED1]/50 text-[#556B5A]"
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div
                        className={`text-xs ${
                          whenType === option.id
                            ? "text-white/70"
                            : "text-[#556B5A]/50"
                        }`}
                      >
                        {option.description}
                      </div>
                    </button>
                  ))}

                  {/* Date picker for specific date */}
                  {whenType === "specific_date" && (
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#E6DED1]/30 text-[#556B5A] outline-none mt-2"
                    />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          /* Template Mode */
          <div className="space-y-3">
            {CURATED_TEMPLATES.map((template) => {
              const isExpanded = expandedTemplateId === template.id;
              const selectedInTemplate = template.items.filter(item => selectedTemplateItems.includes(item)).length;

              return (
                <div key={template.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                      isExpanded ? "bg-[#556B5A] text-white shadow-md" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.emoji}</span>
                      <div className="text-left">
                        <h3 className="font-bold">{template.name}</h3>
                        {selectedInTemplate > 0 && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isExpanded ? "bg-white/20 text-white" : "bg-[#556B5A]/10 text-[#556B5A]"
                          }`}>
                            {selectedInTemplate} selected
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-[#556B5A]/40" />}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-2 bg-white/50 rounded-2xl p-2 space-y-1"
                    >
                      {template.items.map((item) => {
                        const isSelected = selectedTemplateItems.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleTemplateItem(item)}
                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                              isSelected ? "bg-[#556B5A]/10" : "hover:bg-[#E6DED1]/30"
                            }`}
                          >
                            <span className={`text-sm ${isSelected ? "text-[#556B5A] font-medium" : "text-[#556B5A]/70"}`}>
                              {item}
                            </span>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected ? "bg-[#556B5A] border-[#556B5A]" : "border-[#556B5A]/20"
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
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F6F2EC] via-[#F6F2EC] to-transparent pt-12 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={(mode === 'custom' ? !title.trim() : selectedTemplateItems.length === 0) || isPending || (mode === 'custom' && pendingCount >= 5)}
          className="w-full py-4 bg-[#7C9A86] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#556B5A] transition-colors disabled:opacity-50"
        >
          {isPending ? (
            "Adding..."
          ) : pendingCount >= 5 && mode === 'custom' ? (
            "Limit reached"
          ) : (
            <>
              {mode === 'custom' ? (
                <>
                  <Plus className="w-5 h-5" />
                  Add to list
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Add {selectedTemplateItems.length} Experiences
                </>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
