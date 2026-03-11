"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteProduct } from "@/app/actions/admin";

export function DeleteProductButton({ productId, productName }: { productId: string, productName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This will also delete all associated habits and life lists.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteProduct(productId);
      if (result.success) {
        toast.success(`Product "${productName}" deleted successfully`);
      } else {
        toast.error(result.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("An error occurred while deleting the product");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500 disabled:opacity-50"
      title="Delete Product"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
