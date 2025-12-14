"use client";

import { useTransition, useState } from "react";
import { createProduct } from "@/app/actions/admin";

export function AdminDashboardClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSubmit = (formData: FormData) => {
    const email = formData.get("email") as string;
    const productName = formData.get("productName") as string;

    startTransition(async () => {
      const result = await createProduct(email, productName);
      if (result.error) {
        setMessage({ text: result.error, type: 'error' });
      } else {
        setMessage({ text: "Product created successfully!", type: 'success' });
        // Optional: clear form
        const form = document.getElementById("create-product-form") as HTMLFormElement;
        form?.reset();
      }
    });
  };

  return (
    <form id="create-product-form" action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
        <input 
          name="email" 
          type="email" 
          required 
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="user@example.com" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
        <input 
          name="productName" 
          type="text" 
          required 
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="e.g. Red Charm" 
        />
      </div>
      
      {message && (
        <div className={`text-sm p-2 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isPending}
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Product Link"}
      </button>
    </form>
  );
}
