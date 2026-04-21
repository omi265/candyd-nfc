"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import cloudinary from "@/lib/cloudinary";
import { extractPublicId, deleteFromCloudinary, isValidCloudinaryUrl, getSignedUrlFromCloudinaryUrl } from "@/lib/cloudinary-helper";

const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(15, "Title too long"),
  description: z.string().optional(),
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

    let peopleIdsArray: string[] = [];
    if (peopleIds) {
      try {
        peopleIdsArray = JSON.parse(peopleIds);
        if (!Array.isArray(peopleIdsArray)) peopleIdsArray = [];
      } catch {
        peopleIdsArray = [];
      }
    }
    
    const memory = await db.memory.create({
      data: {
        title,
        description: description || "",
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
                // Filter to only valid Cloudinary URLs and prepare batch data
                const mediaData = urls
                  .map((url, i) => ({
                    url,
                    type: types[i],
                    size: sizes[i] || 0,
                    memoryId: memory.id,
                    orderIndex: i,
                  }))
                  .filter((item) => isValidCloudinaryUrl(item.url));

                if (mediaData.length > 0) {
                  await db.media.createMany({ data: mediaData });
                }
            }
        } catch (e) {
            console.error("Error parsing media URLs/Types", e);
            // Non-blocking, but good to know
        }
    }

    revalidatePath("/"); // Update home page
    revalidatePath("/memories");
    revalidatePath("/life-charm");
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
        media: {
          orderBy: {
            orderIndex: "asc"
          }
        }
      }
    });

    // Return signed URLs for authenticated delivery
    return memories.map(m => ({
        ...m,
        media: m.media.map(med => ({
            ...med,
            url: getSignedUrlFromCloudinaryUrl(med.url, med.type)
        }))
    }));
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

export async function getDashboardProducts() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const products = await db.product.findMany({
            where: {
                userId: session.user.id,
                active: true,
            },
            select: {
                id: true,
                name: true,
                type: true,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
        return products;
    } catch (error) {
        console.error("Failed to fetch dashboard products:", error);
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
        
        // Return signed URLs for authenticated delivery
        return {
            ...memory,
            media: memory.media.map(m => ({
                ...m,
                url: getSignedUrlFromCloudinaryUrl(m.url, m.type)
            }))
        };
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

        let peopleIdsArray: string[] = [];
        if (peopleIds) {
          try {
            peopleIdsArray = JSON.parse(peopleIds);
            if (!Array.isArray(peopleIdsArray)) peopleIdsArray = [];
          } catch {
            peopleIdsArray = [];
          }
        }

        await db.memory.update({
            where: { id },
            data: {
                title,
                description: description || "",
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
             let items: any[] = [];
             try {
               items = JSON.parse(orderedMedia);
               if (!Array.isArray(items)) items = [];
             } catch {
               items = [];
             }

             // Separate new and existing items
             const newItems = items.filter(item => item.isNew);
             const existingItems = items.filter(item => !item.isNew && item.id);
             const existingIds = existingItems.map(item => item.id);

             // 0. Identify and delete removed items
             const currentMedia = await db.media.findMany({
                 where: { memoryId: id },
                 select: { id: true, url: true }
             });

             const removedMedia = currentMedia.filter(m => !existingIds.includes(m.id));
             
             if (removedMedia.length > 0) {
                 // Delete from Cloudinary
                 const publicIds = removedMedia
                     .map(m => extractPublicId(m.url))
                     .filter((id): id is string => id !== null);
                 
                 if (publicIds.length > 0) {
                     await deleteFromCloudinary(publicIds);
                 }

                 // Delete from Database
                 await db.media.deleteMany({
                     where: {
                         id: { in: removedMedia.map(m => m.id) }
                     }
                 });
             }

             // 1. Bulk create new items
             if (newItems.length > 0) {
                 // We need to map them to the correct order index relative to the FULL list
                 // Since createMany doesn't let us easily map "this item from the source array goes to this index" 
                 // without strict ordering, we can assign orderIndex based on their position in the `items` array.
                 // However, we need to know WHICH `i` corresponds to which item.
                 
                 // Strategy: iterate original `items` to find the index for new items
                 const newMediaData = newItems.map(newItem => {
                     const index = items.indexOf(newItem);
                     return {
                        url: newItem.url,
                        type: newItem.type,
                        size: newItem.size || 0,
                        memoryId: id,
                        orderIndex: index
                     };
                 });

                 await db.media.createMany({
                     data: newMediaData
                 });
             }

             // 2. Batch update existing items (reordering)
             if (existingItems.length > 0) {
                 await db.$transaction(async (tx) => {
                     for (const item of existingItems) {
                         const index = items.indexOf(item);
                         await tx.media.update({
                             where: { id: item.id },
                             data: { orderIndex: index }
                         });
                     }
                 });
             }
        }
        // Fallback: Add NEW media if provided via old method (only if orderedMedia not present)
        else if (mediaUrls && mediaTypes) {
             let urls: string[] = [];
             let types: string[] = [];
             let sizes: number[] = [];

             try {
               urls = JSON.parse(mediaUrls);
               types = JSON.parse(mediaTypes);
               sizes = mediaSizes ? JSON.parse(mediaSizes) : [];
               if (!Array.isArray(urls)) urls = [];
               if (!Array.isArray(types)) types = [];
               if (!Array.isArray(sizes)) sizes = [];
             } catch {
               urls = [];
               types = [];
               sizes = [];
             }

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
        revalidatePath("/memories");
        revalidatePath("/life-charm");
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
        revalidatePath("/memories");
        revalidatePath("/life-charm");
        return { success: true };
    } catch (error: any) {
         return { error: error.message };
    }
}

export async function toggleMemoryLike(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const memory = await db.memory.findUnique({
            where: { id },
            select: { userId: true, isLiked: true }
        });

        if (!memory || memory.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        await db.memory.update({
            where: { id },
            data: { isLiked: !memory.isLiked }
        });

        revalidatePath("/");
        revalidatePath("/life-charm");
        revalidatePath(`/memory/${id}`);
        return { success: true, isLiked: !memory.isLiked };
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
            select: { userId: true, type: true }
        });

        if (!product || product.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        const publicIds: string[] = [];

        if (product.type === 'MEMORY' || product.type === 'LIFE') {
            // 1. Gather all media from Memories
            const memories = await db.memory.findMany({
                where: { productId: id },
                include: { media: true }
            });

            memories.forEach(mem => {
                if (mem.media) {
                    mem.media.forEach(m => {
                        const pid = extractPublicId(m.url);
                        if (pid) publicIds.push(pid);
                    });
                }
            });

            // 2. Gather all media from Life List Experiences
            const lifeLists = await db.lifeList.findMany({
                where: { productId: id },
                include: {
                    items: {
                        include: {
                            experience: {
                                include: { media: true }
                            }
                        }
                    }
                }
            });

            lifeLists.forEach(ll => {
                ll.items.forEach(item => {
                    if (item.experience?.media) {
                        item.experience.media.forEach(m => {
                            const pid = extractPublicId(m.url);
                            if (pid) publicIds.push(pid);
                        });
                    }
                });
            });

            // 3. Delete DB records
            await db.lifeList.deleteMany({ where: { productId: id } });
            await db.memory.deleteMany({ where: { productId: id } });

        } else if (product.type === 'HABIT') {
            // 1. Gather all media from Habit Logs
            const habits = await db.habit.findMany({
                where: { productId: id },
                include: {
                    logs: {
                        where: { imageUrl: { not: null } }
                    }
                }
            });

            habits.forEach(h => {
                h.logs.forEach(log => {
                    if (log.imageUrl) {
                        const pid = extractPublicId(log.imageUrl);
                        if (pid) publicIds.push(pid);
                    }
                });
            });

            // 2. Delete DB records
            await db.habit.deleteMany({ where: { productId: id } });
        }

        // 2. Delete from Cloudinary
        if (publicIds.length > 0) {
            await deleteFromCloudinary(publicIds);
        }

        await db.product.delete({
            where: { id }
        });

        revalidatePath("/manage-charms");
        revalidatePath("/memories");
        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("Delete Product Error:", error);
        return { error: error.message };
    }
}

export async function getCharmStats(productId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const product = await db.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });

        if (!product || product.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        // Count memories linked to this product
        const memoryCount = await db.memory.count({
            where: { productId }
        });

        // Calculate total media size for these memories
        const mediaSize = await db.media.aggregate({
            where: {
                memory: {
                    productId
                }
            },
            _sum: {
                size: true
            }
        });

        return {
            memoryCount,
            totalSizeBytes: mediaSize._sum.size || 0,
            limit: 50 
        };
    } catch (error) {
        console.error("Failed to fetch charm stats:", error);
        return { error: "Failed to fetch stats" };
    }
}

export async function updateProductGuestUploads(productId: string, allow: boolean) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const product = await db.product.findUnique({
            where: { id: productId },
            select: { userId: true }
        });

        if (!product || product.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        await db.product.update({
            where: { id: productId },
            data: { allowGuestUploads: allow }
        });

        revalidatePath("/manage-charms");
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
