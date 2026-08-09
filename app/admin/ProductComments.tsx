"use client";

import { useState, useEffect, useRef } from "react";
import { updateProductComments } from "@/app/actions/admin";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProductCommentsProps {
    productId: string;
    initialComments: string | null;
}

export function ProductComments({ productId, initialComments }: ProductCommentsProps) {
    const [comments, setComments] = useState(initialComments || "");
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialRender = useRef(true);

    const handleSave = async (value: string) => {
        setIsSaving(true);
        try {
            const result = await updateProductComments(productId, value);
            if (result.error) {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Failed to save comments");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setComments(newValue);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            handleSave(newValue);
        }, 1000);
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="relative group">
            <textarea
                value={comments}
                onChange={handleChange}
                placeholder="Order notes..."
                className="w-full bg-white/50 border border-[#556B5A]/10 rounded-xl px-3 py-2 text-xs text-[#556B5A] focus:outline-none focus:ring-1 focus:ring-[#556B5A]/30 min-h-[60px] resize-none placeholder:text-[#556B5A]/30"
            />
            {isSaving && (
                <div className="absolute top-2 right-2">
                    <Loader2 className="w-3 h-3 animate-spin text-[#556B5A]/40" />
                </div>
            )}
        </div>
    );
}
