"use client";

import { useTransition, useState } from "react";
import { createProduct } from "@/app/actions/admin";

import { toast } from "sonner";

const CHARM_TYPES: Array<{
  id: "LIFE" | "HABIT";
  label: string;
  emoji: string;
  description: string;
  disabled?: boolean;
}> = [
  { id: "LIFE", label: "Life Charm", emoji: "✨", description: "For bucket lists and experiences" },
  { id: "HABIT", label: "Habit Charm", emoji: "⚡", description: "For habit tracking and focus areas" },
];

export function AdminDashboardClient({ users = [] }: { users: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [charmType, setCharmType] = useState<"LIFE" | "HABIT">("LIFE");
  const [selectedEmail, setSelectedEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) {
        toast.error("Please select a user");
        return;
    }

    startTransition(async () => {
      const result = await createProduct(selectedEmail, "New Charm", charmType);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product created successfully!");
        setSelectedEmail("");
        setCharmType("LIFE");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#5B2D7D] mb-1">Select User</label>
        <select
          name="email"
          required
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-[#EADDDE] rounded-xl focus:ring-2 focus:ring-[#5B2D7D] outline-none text-[#5B2D7D] appearance-none font-[Outfit]"
        >
          <option value="" className="font-[Outfit]">-- Choose a user --</option>
          {users.map((user) => (
            <option key={user.id} value={user.email} className="font-[Outfit]">
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5B2D7D] mb-2">Charm Type</label>
        <div className="grid grid-cols-1 gap-2">
          {CHARM_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              disabled={type.disabled}
              onClick={() => !type.disabled && setCharmType(type.id)}
              className={`px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                charmType === type.id
                  ? "bg-[#5B2D7D] text-white shadow-md"
                  : type.disabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-[#EADDDE] text-[#5B2D7D] hover:border-[#5B2D7D]/30 shadow-sm"
              }`}
            >
              <span className="text-2xl">{type.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{type.label}</div>
                <div className={`text-xs ${charmType === type.id ? "text-white/70" : "text-[#5B2D7D]/50"}`}>
                  {type.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#A4C538] text-white font-bold py-4 rounded-xl hover:bg-[#93B132] transition-colors disabled:opacity-50 shadow-lg mt-4"
      >
        {isPending ? "Creating..." : "Create Product Link"}
      </button>
    </form>
  );
}
