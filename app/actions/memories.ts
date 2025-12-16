"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import cloudinary from "@/lib/cloudinary";

const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(), // We will parse this to Date object
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(), // Comma separated or JSON string
  mood: z.string().optional(),
  productId: z.string().optional(),
  mediaUrls: z.string().optional(), // JSON string of string[]
  mediaTypes: z.string().optional(), // JSON string of string[]
});

export async function createMemory(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  console.log("ACTION: createMemory called");
  const session = await auth();
  if (!session?.user?.id) {
    console.error("ACTION: Unauthorized");
    return { error: "Unauthorized" };
  }
  console.log("ACTION: User authorized", session.user.id);

  const rawData = Object.fromEntries(formData.entries());
  console.log("ACTION: Raw form data keys", Object.keys(rawData));
  const validatedFields = createMemorySchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error("ACTION: Validation failed", validatedFields.error);
    return { error: "Invalid fields: " + validatedFields.error.issues.map((i) => i.message).join(", ") };
  }


  const { title, description, date, time, location, emotions, mood, productId, mediaUrls, mediaTypes } = validatedFields.data;

  // content-type check for date if needed
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
      console.error("ACTION: Invalid Date", date);
      return { error: "Invalid date format" };
  }

  try {
    // 1. Create Memory
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
        userId: session.user.id,
        productId: productId || undefined,
      },
    });

    // 2. Add Media Records (from client-side uploaded URLs)
    if (mediaUrls && mediaTypes) {
        try {
            const urls = JSON.parse(mediaUrls) as string[];
            const types = JSON.parse(mediaTypes) as string[];

            if (Array.isArray(urls) && Array.isArray(types) && urls.length === types.length) {
                for (let i = 0; i < urls.length; i++) {
                     await db.media.create({
                        data: {
                            url: urls[i],
                            type: types[i], // 'image', 'video'
                            size: 0, // We don't have size readily available, or we could pass it. Optional.
                            memoryId: memory.id
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error parsing media URLs/Types", e);
            // Non-blocking, but good to know
        }
    }

    revalidatePath("/"); // Update home page
    return { success: true };
  } catch (error: any) {
    console.error("Database Error:", error);
    return { error: "Failed to create memory: " + (error.message || "Unknown DB error") };
  }
}

export async function getMemories(productId?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const whereClause: any = {
        userId: session.user.id,
    };

    if (productId) {
        whereClause.productId = productId;
    }

    const memories = await db.memory.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        media: true, // Will be empty for now
      }
    });
    return memories;
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    return [];
  }
}

export async function getUserProducts() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const products = await db.product.findMany({
            where: {
                userId: session.user.id,
                active: true,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
        return products;
    } catch (error) {
        console.error("Failed to fetch user products:", error);
        return [];
    }
}

export async function getProductIdFromToken(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true }
        });
        return product?.id || null;
    } catch (error) {
        console.error("Failed to get product from token:", error);
        return null;
    }
}
