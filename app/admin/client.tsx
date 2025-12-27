"use client";

import { useTransition, useState } from "react";
import { createProduct } from "@/app/actions/admin";

import { toast } from "sonner";

const CHARM_TYPES: Array<{
  id: "MEMORY" | "LIFE" | "HABIT";
  label: string;
  description: string;
  disabled?: boolean;
}> = [
  { id: "MEMORY", label: "Memory Charm", description: "For storing memories with photos/videos" },
  { id: "LIFE", label: "Life Charm", description: "For bucket lists and experiences" },
  { id: "HABIT", label: "Habit Charm", description: "For habit tracking and focus areas" },
];

export function AdminDashboardClient() {
  const [isPending, startTransition] = useTransition();
  const [charmType, setCharmType] = useState<"MEMORY" | "LIFE" | "HABIT">("MEMORY");

  const handleSubmit = (formData: FormData) => {
    const email = formData.get("email") as string;
    const productName = formData.get("productName") as string;

    startTransition(async () => {
      const result = await createProduct(email, productName, charmType);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product created successfully!");
        // Optional: clear form
        const form = document.getElementById("create-product-form") as HTMLFormElement;
        form?.reset();
        setCharmType("MEMORY");
      }
    });
  };

  return (
    <form id="create-product-form" action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#5B2D7D] mb-1">User Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 bg-white/80 border border-[#EADDDE] rounded-xl focus:ring-2 focus:ring-[#5B2D7D] outline-none text-[#5B2D7D] placeholder-[#5B2D7D]/40"
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#5B2D7D] mb-1">Product Name</label>
        <input
          name="productName"
          type="text"
          required
          className="w-full px-4 py-3 bg-white/80 border border-[#EADDDE] rounded-xl focus:ring-2 focus:ring-[#5B2D7D] outline-none text-[#5B2D7D] placeholder-[#5B2D7D]/40"
          placeholder="e.g. Red Charm"
        />
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
              className={`px-4 py-3 rounded-xl text-left transition-all ${
                charmType === type.id
                  ? "bg-[#5B2D7D] text-white"
                  : type.disabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white/80 border border-[#EADDDE] text-[#5B2D7D] hover:border-[#5B2D7D]/30"
              }`}
            >
              <div className="font-medium">{type.label}</div>
              <div className={`text-xs ${charmType === type.id ? "text-white/70" : "text-[#5B2D7D]/50"}`}>
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#5B2D7D] text-white font-medium py-3 rounded-xl hover:bg-[#4a2466] transition-colors disabled:opacity-50 shadow-sm"
      >
        {isPending ? "Creating..." : "Create Product Link"}
      </button>
    </form>
  );
}
