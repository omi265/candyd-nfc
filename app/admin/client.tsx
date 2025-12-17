"use client";

import { useTransition, useState } from "react";
import { createProduct } from "@/app/actions/admin";

import { toast } from "sonner";

export function AdminDashboardClient() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const email = formData.get("email") as string;
    const productName = formData.get("productName") as string;

    startTransition(async () => {
      const result = await createProduct(email, productName);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product created successfully!");
        // Optional: clear form
        const form = document.getElementById("create-product-form") as HTMLFormElement;
        form?.reset();
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
