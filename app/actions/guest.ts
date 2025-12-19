"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const GUEST_COOKIE = "guest_session";

const createGuestMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(),
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(),
  mood: z.string().optional(),
  mediaUrls: z.string().optional(),
  mediaTypes: z.string().optional(),
  mediaSizes: z.string().optional(),
  guestName: z.string().optional(),
});

export async function loginGuest(token: string) {
  const product = await db.product.findUnique({
    where: { guestToken: token },
  });

  if (!product) {
    return { error: "Invalid guest link" };
  }

  // Set cookie
  // Note: cookies().set() in Server Action might require strict mode or await in newer Next.js
  // But generally works in simple server actions.
  (await cookies()).set(GUEST_COOKIE, product.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  return { success: true, productId: product.id };
}

export async function getGuestSession() {
    const cookieStore = await cookies();
    const productId = cookieStore.get(GUEST_COOKIE)?.value;
    
    if (!productId) return null;
    
    // Verify product still exists? Optional but good.
    // For now trust the cookie to avoid DB hit on every render if not needed, 
    // but verifying ensures validity.
    // Let's verify lightly or just return ID.
    return productId;
}

export async function logoutGuest() {
    (await cookies()).delete(GUEST_COOKIE);
    redirect("/guest/login");
}

export async function createGuestMemory(prevState: any, formData: FormData) {
    const productId = await getGuestSession();
    if (!productId) {
        return { error: "Unauthorized guest session" };
    }

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = createGuestMemorySchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields: " + validatedFields.error.issues.map((i) => i.message).join(", ") };
    }

    const { title, description, date, time, location, emotions, mood, mediaUrls, mediaTypes, mediaSizes, guestName } = validatedFields.data;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        return { error: "Invalid date format" };
    }

    try {
        // Get product owner to link? 
        // Schema says memory connects to User (required) and Product (optional).
        // Wait, Memory.userId is REQUIRED.
        // Guest doesn't have a user ID.
        // We need to fetch the Product's owner and assign the memory to THEM, but mark isGuest=true.
        
        const product = await db.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });

        if (!product) return { error: "Product not found" };

        const emotionsArray = emotions ? emotions.split(",") : [];

        const memory = await db.memory.create({
            data: {
                title,
                description,
                date: parsedDate,
                time,
                location,
                emotions: emotionsArray,
                mood,
                userId: product.userId, // Assign to product owner
                productId: productId,
                isGuest: true,
                guestName: guestName || "Guest",
            },
        });

        // Add Media
        if (mediaUrls && mediaTypes) {
             const urls = JSON.parse(mediaUrls) as string[];
             const types = JSON.parse(mediaTypes) as string[];
             const sizes = mediaSizes ? (JSON.parse(mediaSizes) as number[]) : [];

             if (Array.isArray(urls) && Array.isArray(types)) {
                 for (let i = 0; i < urls.length; i++) {
                     await db.media.create({
                        data: {
                            url: urls[i],
                            type: types[i],
                            size: sizes[i] || 0,
                            memoryId: memory.id,
                            orderIndex: i
                        }
                    });
                }
             }
        }

        revalidatePath(`/guest/memories`);
        return { success: true };
    } catch (error: any) {
        console.error("Guest Memory Error:", error);
        return { error: "Failed to create memory" };
    }
}

export async function getGuestMemories() {
    const productId = await getGuestSession();
    if (!productId) return [];

    try {
        const memories = await db.memory.findMany({
            where: { 
                productId: productId,
                // Do we show ALL memories of the charm to guests? 
                // User said: "can go bacck to see the other memories on the charm"
                // So yes, fetch all memories for this charm.
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                media: true
            }
        });
        return memories;
    } catch (error) {
        console.error("Failed to fetch guest memories:", error);
        return [];
    }
}

export async function addGuestMedia(memoryId: string, mediaItems: { url: string; type: string; size: number }[]) {
    const productId = await getGuestSession();
    if (!productId) {
        return { error: "Unauthorized guest session" };
    }

    try {
        // Verify memory belongs to this product
        const memory = await db.memory.findUnique({
            where: { id: memoryId },
            select: { productId: true }
        });

        if (!memory || memory.productId !== productId) {
            return { error: "Unauthorized: Memory does not belong to this guest session" };
        }

        // Get current max order index to append correctly
        const lastMedia = await db.media.findFirst({
            where: { memoryId },
            orderBy: { orderIndex: 'desc' }
        });
        let nextIndex = (lastMedia?.orderIndex ?? -1) + 1;

        for (const item of mediaItems) {
             await db.media.create({
                data: {
                    url: item.url,
                    type: item.type,
                    size: item.size,
                    memoryId,
                    orderIndex: nextIndex++
                }
            });
        }

        revalidatePath(`/guest/memories`);
        return { success: true };
    } catch (error: any) {
        console.error("Add Guest Media Error:", error);
        return { error: "Failed to add media" };
    }
}
