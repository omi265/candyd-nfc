"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Save, Users, Calendar, ChevronDown } from "lucide-react";
import { updateListItem } from "@/app/actions/life-charm";
import { createPerson } from "@/app/actions/people";
import { toast } from "sonner";
import { LifeListItem, Person, Experience, ExperienceMedia } from "@prisma/client";

type ItemWithExperience = LifeListItem & {
  lifeList: { userId: string; productId: string };
  experience: (Experience & { media: ExperienceMedia[] }) | null;
};

interface EditItemClientProps {
  item: ItemWithExperience;
  people: Person[];
  charmId: string;
}

const WHEN_OPTIONS = [
  { id: "someday", label: "Someday", description: "When the time feels right" },
  { id: "this_year", label: "This Year", description: "Before the year ends" },
  { id: "this_month", label: "This Month", description: "In the coming weeks" },
  { id: "specific_date", label: "Specific Date", description: "Pick a date" },
];

export default function EditItemClient({ item, people: initialPeople, charmId }: EditItemClientProps) {
  const router = useRouter();
  
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(item.peopleIds);
  const [whenType, setWhenType] = useState<string | null>(item.whenType);
  const [targetDate, setTargetDate] = useState(item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : "");
  
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [showWhenSelector, setShowWhenSelector] = useState(false);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [newPersonName, setNewPersonName] = useState("");
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  
  const [isPending, startTransition] = useTransition();

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

  const handleSave = () => {
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

    startTransition(async () => {
      const result = await updateListItem(item.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        peopleIds: selectedPeople,
        whenType: whenType,
        targetDate: whenType === "specific_date" && targetDate ? targetDate : null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Item updated!");
        router.push(`/life-charm/item/${item.id}?charmId=${charmId}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-dvh bg-[#FDF2EC] flex flex-col font-[Outfit]">
      {/* Header */}
      <header className="flex flex-col border-b border-[#5B2D7D]/10 bg-white shrink-0">
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push(`/life-charm/item/${item.id}?charmId=${charmId}`)}
            className="w-10 h-10 rounded-full bg-[#FDF2EC] flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-[#5B2D7D]" />
          </button>
          <h1 className="text-xl font-bold text-[#5B2D7D]">Edit Experience</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto pb-32 no-scrollbar">
        <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2">
                What do you want to do? *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Watch the sunset together"
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none focus:border-[#5B2D7D]/30 transition-colors"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none focus:border-[#5B2D7D]/30 transition-colors resize-none"
              />
            </div>

            {/* Who */}
            <div>
              <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2">
                Who do you want to do this with?
              </label>
              <button
                onClick={() => setShowPeopleSelector(!showPeopleSelector)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#5B2D7D]/40" />
                  {selectedPeople.length > 0 ? (
                    <span className="text-[#5B2D7D]">
                      {selectedPeople
                        .map((id) => people.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-[#5B2D7D]/30">Select people</span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#5B2D7D]/40 transition-transform ${
                    showPeopleSelector ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* People selector dropdown */}
              {showPeopleSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-white rounded-xl border border-[#5B2D7D]/10 space-y-2"
                >
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => togglePerson(person.id)}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between ${
                        selectedPeople.includes(person.id)
                          ? "bg-[#5B2D7D] text-white"
                          : "hover:bg-[#EADDDE]/50 text-[#5B2D7D]"
                      }`}
                    >
                      {person.name}
                      {selectedPeople.includes(person.id) && (
                        <span className="text-sm">✓</span>
                      )}
                    </button>
                  ))}

                  {/* Add new person */}
                  <div className="flex gap-2 pt-2 border-t border-[#5B2D7D]/10">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Add someone new..."
                      className="flex-1 px-3 py-2 rounded-lg bg-[#EADDDE]/30 text-[#5B2D7D] placeholder-[#5B2D7D]/30 outline-none text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
                    />
                    <button
                      onClick={handleAddPerson}
                      disabled={!newPersonName.trim() || isAddingPerson}
                      className="px-3 py-2 bg-[#5B2D7D] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {isAddingPerson ? "..." : "Add"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* When */}
            <div>
              <label className="block text-sm font-medium text-[#5B2D7D]/60 mb-2">
                When feels right?
              </label>
              <button
                onClick={() => setShowWhenSelector(!showWhenSelector)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#5B2D7D]/10 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#5B2D7D]/40" />
                  {whenType ? (
                    <span className="text-[#5B2D7D]">
                      {WHEN_OPTIONS.find((o) => o.id === whenType)?.label}
                      {whenType === "specific_date" && targetDate && (
                        <span className="ml-1 text-[#5B2D7D]/60">
                          ({new Date(targetDate).toLocaleDateString()})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#5B2D7D]/30">Select timing</span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#5B2D7D]/40 transition-transform ${
                    showWhenSelector ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* When selector dropdown */}
              {showWhenSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-white rounded-xl border border-[#5B2D7D]/10 space-y-2"
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
                          ? "bg-[#5B2D7D] text-white"
                          : "hover:bg-[#EADDDE]/50 text-[#5B2D7D]"
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div
                        className={`text-xs ${
                          whenType === option.id
                            ? "text-white/70"
                            : "text-[#5B2D7D]/50"
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
                      className="w-full px-3 py-2 rounded-lg bg-[#EADDDE]/30 text-[#5B2D7D] outline-none mt-2"
                    />
                  )}
                </motion.div>
              )}
            </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDF2EC] via-[#FDF2EC] to-transparent pt-12 shrink-0 z-30">
        <button
          onClick={handleSave}
          disabled={!title.trim() || isPending}
          className="w-full py-4 bg-[#A4C538] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-[#93B132] transition-colors disabled:opacity-50"
        >
          {isPending ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
