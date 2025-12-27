"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import cloudinary from "@/lib/cloudinary";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";

const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(), // We will parse this to Date object
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(), // Comma separated or JSON string
  events: z.string().optional(), // Comma separated or JSON string
  mood: z.string().optional(),
  productId: z.string().optional(),
  peopleIds: z.string().optional(), // JSON string of string[]
  mediaUrls: z.string().optional(), // JSON string of string[]
  mediaTypes: z.string().optional(), // JSON string of string[]
  mediaSizes: z.string().optional(), // JSON string of number[]
  orderedMedia: z.string().optional(), // JSON string of { id?: string, url: string, type: string, size: number, isNew: boolean }[]
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


  const { title, description, date, time, location, emotions, events, mood, productId, peopleIds, mediaUrls, mediaTypes, mediaSizes } = validatedFields.data;

  // content-type check for date if needed
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
      console.error("ACTION: Invalid Date", date);
      return { error: "Invalid date format" };
  }

  try {
    // 1. Create Memory
    const emotionsArray = emotions ? emotions.split(",") : [];
    const eventsArray = events ? events.split(",") : [];
    const peopleIdsArray = peopleIds ? JSON.parse(peopleIds) : [];
    
    const memory = await db.memory.create({
      data: {
        title,
        description,
        date: parsedDate,
        time,
        location,
        emotions: emotionsArray,
        events: eventsArray,
        mood,
        peopleIds: peopleIdsArray,
        userId: session.user.id,
        productId: productId || undefined,
      },
    });

    // 2. Add Media Records (from client-side uploaded URLs)
    if (mediaUrls && mediaTypes) {
        try {
            const urls = JSON.parse(mediaUrls) as string[];
            const types = JSON.parse(mediaTypes) as string[];
            const sizes = mediaSizes ? (JSON.parse(mediaSizes) as number[]) : [];

            if (Array.isArray(urls) && Array.isArray(types) && urls.length === types.length) {
                for (let i = 0; i < urls.length; i++) {
                    await db.media.create({
                        data: {
                            url: urls[i],
                            type: types[i], // 'image', 'video'
                            size: sizes[i] || 0,
                            memoryId: memory.id,
                            orderIndex: i // Set initial order
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
            include: {
                lifeLists: {
                    include: {
                        items: {
                            include: {
                                experience: {
                                    include: {
                                        media: true
                                    }
                                }
                            }
                        }
                    }
                },
                habits: true
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

export async function getMemory(id: string) {
    const session = await auth();
    if (!session?.user?.id || !id) return null;

    try {
        const memory = await db.memory.findUnique({
            where: { id },
            include: { 
                media: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                } 
            }
        });
        
        if (!memory || memory.userId !== session.user.id) return null;
        
        return memory;
    } catch (error) {
        console.error("Failed to fetch memory:", error);
        return null;
    }
}

export async function updateMemory(id: string, prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = createMemorySchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields: " + validatedFields.error.issues.map((i) => i.message).join(", ") };
    }

    const { title, description, date, time, location, emotions, events, mood, productId, peopleIds, mediaUrls, mediaTypes, mediaSizes, orderedMedia } = validatedFields.data;
    const parsedDate = new Date(date);

    try {
        const memory = await db.memory.findUnique({
             where: { id },
             select: { userId: true }
        });

        if (!memory || memory.userId !== session.user.id) {
             return { error: "Unauthorized or Memory not found" };
        }

        const emotionsArray = emotions ? emotions.split(",") : [];
        const eventsArray = events ? events.split(",") : [];
        const peopleIdsArray = peopleIds ? JSON.parse(peopleIds) : [];

        await db.memory.update({
            where: { id },
            data: {
                title,
                description,
                date: parsedDate,
                time,
                location,
                emotions: emotionsArray,
                events: eventsArray,
                mood,
                peopleIds: peopleIdsArray,
                productId: productId || undefined,
            }
        });

        // Handle Ordered Media (Consolidated New + Existing)
        if (orderedMedia) {
             const items = JSON.parse(orderedMedia);
             
             // Process sequentially to ensure orderIndex is correct
             for (let i = 0; i < items.length; i++) {
                 const item = items[i];
                 
                 if (item.isNew) {
                     // Create new media with correct index
                     await db.media.create({
                        data: {
                            url: item.url,
                            type: item.type,
                            size: item.size || 0,
                            memoryId: id,
                            orderIndex: i
                        }
                    });
                 } else if (item.id) {
                     // Update existing media index
                     // We use updateMany or try/catch to avoid errors if media doesn't exist (though it should)
                     // Using update instead to ensure it exists
                     try {
                        await db.media.update({
                            where: { id: item.id },
                            data: { orderIndex: i }
                        });
                     } catch (e) {
                         console.error(`Failed to update media order for ${item.id}`, e);
                     }
                 }
             }
        }
        // Fallback: Add NEW media if provided via old method (only if orderedMedia not present)
        else if (mediaUrls && mediaTypes) {
             const urls = JSON.parse(mediaUrls) as string[];
             const types = JSON.parse(mediaTypes) as string[];
             const sizes = mediaSizes ? (JSON.parse(mediaSizes) as number[]) : [];
             
             // Get current media count to append correctly? or just append.
             // For now just appending with arbitrary orderIndex might be tricky if we mix methods.
             // We'll just append using 0-based index or maybe 100+ to be safe?
             // Actually, simplest is to just start at 0 if we don't care, or better: 
             // find max index? Too complex for fallback. 
             // Let's assume standard creation logic.
             
             if (Array.isArray(urls) && Array.isArray(types)) {
                 for (let i = 0; i < urls.length; i++) {
                     await db.media.create({
                        data: {
                            url: urls[i],
                            type: types[i],
                            size: sizes[i] || 0,
                            memoryId: id,
                            orderIndex: 1000 + i // Append to end roughly
                        }
                    });
                }
             }
        }

        revalidatePath("/");
        revalidatePath(`/memory/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error("Update Error:", error);
        return { error: error.message };
    }
}

export async function deleteMemory(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const memory = await db.memory.findUnique({
            where: { id },
            select: { userId: true, media: true }
        });
        if (!memory || memory.userId !== session.user.id) return { error: "Unauthorized" };

        // Cloudinary Cleanup
        if (memory.media && memory.media.length > 0) {
            const publicIds = memory.media
                .map(m => extractPublicId(m.url))
                .filter((id): id is string => id !== null);
            
            if (publicIds.length > 0) {
                await deleteFromCloudinary(publicIds);
            }
        }

        await db.memory.delete({ where: { id } });
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
         return { error: error.message };
    }
}

export async function deleteProduct(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const product = await db.product.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!product || product.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        // 1. Gather all media associated with this product's memories
        const memories = await db.memory.findMany({
            where: { productId: id },
            select: { 
                id: true,
                media: true 
            }
        });

        const publicIds: string[] = [];
        for (const mem of memories) {
            if (mem.media) {
                mem.media.forEach(m => {
                    const pid = extractPublicId(m.url);
                    if (pid) publicIds.push(pid);
                });
            }
        }

        // 2. Delete from Cloudinary
        if (publicIds.length > 0) {
            await deleteFromCloudinary(publicIds);
        }

        // 3. Delete Product (Cascades to memories usually, but we can be explicit if needed)
        // Assuming DB cascade is set up, deleting product deletes memories?
        // Let's verify: Prisma usually handles cascade if defined in schema.
        // Even if not, we can delete memories manually first to be safe or just let product deletion handle it.
        // To be safe and explicit:
        await db.memory.deleteMany({
            where: { productId: id }
        });

        await db.product.delete({
            where: { id }
        });

        revalidatePath("/manage-charms");
        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("Delete Product Error:", error);
        return { error: error.message };
    }
}
