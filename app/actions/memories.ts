"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSignedUrlFromCloudinaryUrl } from "@/lib/cloudinary-helper";
import { deleteStoredMedia } from "@/lib/media-storage";
import { isMediaUrlAllowedForScope } from "@/lib/media-url";
import { isMediaKind } from "@/lib/media-validation";

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
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = createMemorySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Invalid fields: " + validatedFields.error.issues.map((i) => i.message).join(", ") };
  }


  const { title, description, date, time, location, emotions, events, mood, productId, peopleIds, mediaUrls, mediaTypes, mediaSizes } = validatedFields.data;

  // content-type check for date if needed
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
      return { error: "Invalid date format" };
  }

  let mediaData: Array<{ url: string; type: string; size: number; orderIndex: number }> = [];
  if (mediaUrls || mediaTypes || mediaSizes) {
    try {
      const urls = mediaUrls ? JSON.parse(mediaUrls) : [];
      const types = mediaTypes ? JSON.parse(mediaTypes) : [];
      const sizes = mediaSizes ? JSON.parse(mediaSizes) : [];

      if (!Array.isArray(urls) || !Array.isArray(types) || !Array.isArray(sizes)) {
        return { error: "Invalid media data" };
      }

      if (urls.length === 0 || urls.length !== types.length) {
        return { error: "Media upload is incomplete. Please try again." };
      }

      mediaData = urls.map((url, i) => ({
        url,
        type: types[i],
        size: typeof sizes[i] === "number" ? sizes[i] : 0,
        orderIndex: i,
      }));

      if (mediaData.some((item) =>
        typeof item.url !== "string" ||
        !isMediaKind(item.type) ||
        !isMediaUrlAllowedForScope(item.url, `users/${session.user.id}`)
      )) {
        return { error: "One or more uploaded media files are invalid. Please upload them again." };
      }
    } catch {
      return { error: "Invalid media data" };
    }
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
    
    await db.$transaction(async (tx) => {
      const memory = await tx.memory.create({
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

      if (mediaData.length > 0) {
        await tx.media.createMany({
          data: mediaData.map((item) => ({ ...item, memoryId: memory.id })),
        });
      }
    });

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
  const session = await getSession();
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

    const signedMemories = await Promise.all(
      memories.map(async (memory) => ({
        ...memory,
        media: await Promise.all(
          memory.media.map(async (m) => ({
            ...m,
            url: await getSignedUrlFromCloudinaryUrl(m.url, m.type, m.type.startsWith("image") ? 1080 : undefined),
            posterUrl: m.type === "video" ? await getSignedUrlFromCloudinaryUrl(m.url, "video-thumbnail", 600) : undefined,
          }))
        ),
      }))
    );

    return signedMemories;
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    return [];
  }
}

export async function getUserProducts() {
    const session = await getSession();
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

        const signedProducts = await Promise.all(
          products.map(async (product) => ({
            ...product,
            lifeLists: await Promise.all(
              product.lifeLists.map(async (list) => ({
                ...list,
                items: await Promise.all(
                  list.items.map(async (item) => ({
                    ...item,
                    experience: item.experience
                      ? {
                          ...item.experience,
                          media: await Promise.all(
                            item.experience.media.map(async (m) => ({
                              ...m,
                              url: await getSignedUrlFromCloudinaryUrl(m.url, m.type, m.type.startsWith("image") ? 1080 : undefined),
                              posterUrl: m.type === "video" ? await getSignedUrlFromCloudinaryUrl(m.url, "video-thumbnail", 600) : undefined,
                            }))
                          ),
                        }
                      : null,
                  }))
                ),
              }))
            ),
          }))
        );

        return signedProducts;
    } catch (error) {
        console.error("Failed to fetch user products:", error);
        return [];
    }
}

export async function getManageCharmProducts() {
    const session = await getSession();
    if (!session?.user?.id) return [];

    try {
        return await db.product.findMany({
            where: {
                userId: session.user.id,
                active: true,
            },
            select: {
                id: true,
                name: true,
                token: true,
                type: true,
                state: true,
                currentStreak: true,
                longestStreak: true,
                allowGuestUploads: true,
                autoApproveGuestUploads: true,
                enableGuestUploadButton: true,
                guestUploadPassword: true,
                comments: true,
                createdAt: true,
                graduatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
    } catch (error) {
        console.error("Failed to fetch manage charm products:", error);
        return [];
    }
}

export async function getDashboardProducts() {
    const session = await getSession();
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
    const session = await getSession();
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
        
        return {
            ...memory,
            media: await Promise.all(
              memory.media.map(async (m) => ({
                ...m,
                url: await getSignedUrlFromCloudinaryUrl(m.url, m.type, m.type.startsWith("image") ? 1080 : undefined),
                posterUrl: m.type === "video" ? await getSignedUrlFromCloudinaryUrl(m.url, "video-thumbnail", 600) : undefined,
              }))
            ),
        };
    } catch (error) {
        console.error("Failed to fetch memory:", error);
        return null;
    }
}

export async function updateMemory(id: string, prevState: any, formData: FormData) {
    const session = await getSession();
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

        type OrderedMediaItem = {
            id?: string;
            url: string;
            type: string;
            size?: number;
            isNew: boolean;
        };

        let orderedItems: OrderedMediaItem[] | null = null;
        let removedMedia: { id: string; url: string }[] = [];
        let fallbackMedia: Array<{ url: string; type: string; size: number }> = [];

        if (orderedMedia) {
            let parsed: unknown;
            try {
                parsed = JSON.parse(orderedMedia);
            } catch {
                return { error: "Invalid media data" };
            }

            if (!Array.isArray(parsed)) return { error: "Invalid media data" };
            orderedItems = parsed as OrderedMediaItem[];

            if (orderedItems.some((item) =>
                !item || typeof item.url !== "string" || !isMediaKind(item.type) ||
                typeof item.isNew !== "boolean" ||
                (item.isNew && !isMediaUrlAllowedForScope(item.url, `users/${session.user.id}`))
            )) {
                return { error: "One or more uploaded media files are invalid" };
            }

            const currentMedia = await db.media.findMany({
                where: { memoryId: id },
                select: { id: true, url: true },
            });
            const currentIds = new Set(currentMedia.map((item) => item.id));
            const existingIds = orderedItems
                .filter((item) => !item.isNew && item.id)
                .map((item) => item.id!);

            if (existingIds.some((mediaId) => !currentIds.has(mediaId))) {
                return { error: "Invalid existing media item" };
            }
            removedMedia = currentMedia.filter((item) => !existingIds.includes(item.id));
        } else if (mediaUrls || mediaTypes || mediaSizes) {
            try {
                const urls: unknown = mediaUrls ? JSON.parse(mediaUrls) : [];
                const types: unknown = mediaTypes ? JSON.parse(mediaTypes) : [];
                const sizes: unknown = mediaSizes ? JSON.parse(mediaSizes) : [];
                if (!Array.isArray(urls) || !Array.isArray(types) || !Array.isArray(sizes) || urls.length !== types.length) {
                    return { error: "Invalid media data" };
                }
                fallbackMedia = urls.map((url, index) => ({
                    url,
                    type: types[index],
                    size: typeof sizes[index] === "number" ? sizes[index] : 0,
                }));
                if (fallbackMedia.some((item) =>
                    typeof item.url !== "string" || !isMediaKind(item.type) ||
                    !isMediaUrlAllowedForScope(item.url, `users/${session.user.id}`)
                )) {
                    return { error: "One or more uploaded media files are invalid" };
                }
            } catch {
                return { error: "Invalid media data" };
            }
        }

        await db.$transaction(async (tx) => {
            await tx.memory.update({
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
                },
            });

            if (orderedItems) {
                if (removedMedia.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: removedMedia.map((item) => item.id) } } });
                }

                const newItems = orderedItems.filter((item) => item.isNew);
                if (newItems.length > 0) {
                    await tx.media.createMany({
                        data: newItems.map((item) => ({
                            url: item.url,
                            type: item.type,
                            size: item.size || 0,
                            memoryId: id,
                            orderIndex: orderedItems!.indexOf(item),
                        })),
                    });
                }

                for (const item of orderedItems.filter((entry) => !entry.isNew && entry.id)) {
                    await tx.media.update({
                        where: { id: item.id! },
                        data: { orderIndex: orderedItems.indexOf(item) },
                    });
                }
            } else if (fallbackMedia.length > 0) {
                const lastMedia = await tx.media.findFirst({
                    where: { memoryId: id },
                    orderBy: { orderIndex: "desc" },
                    select: { orderIndex: true },
                });
                const startIndex = (lastMedia?.orderIndex ?? -1) + 1;
                await tx.media.createMany({
                    data: fallbackMedia.map((item, index) => ({
                        ...item,
                        memoryId: id,
                        orderIndex: startIndex + index,
                    })),
                });
            }
        });

        if (removedMedia.length > 0) {
            await deleteStoredMedia(removedMedia.map((item) => item.url));
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
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const memory = await db.memory.findUnique({
            where: { id },
            select: { userId: true, media: true }
        });
        if (!memory || memory.userId !== session.user.id) return { error: "Unauthorized" };

        if (memory.media && memory.media.length > 0) {
            await deleteStoredMedia(memory.media.map((media) => media.url));
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
    const session = await getSession();
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
    const session = await getSession();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const product = await db.product.findUnique({
            where: { id },
            select: { userId: true, type: true }
        });

        if (!product || product.userId !== session.user.id) {
            return { error: "Unauthorized" };
        }

        const mediaUrlsToDelete: string[] = [];

        if (product.type === 'MEMORY' || product.type === 'LIFE') {
            // 1. Gather all media from Memories
            const memories = await db.memory.findMany({
                where: { productId: id },
                include: { media: true }
            });

            memories.forEach(mem => {
                if (mem.media) {
                    mem.media.forEach((media) => mediaUrlsToDelete.push(media.url));
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
                        item.experience.media.forEach((media) => mediaUrlsToDelete.push(media.url));
                    }
                });
            });

            await deleteStoredMedia(mediaUrlsToDelete);
            mediaUrlsToDelete.length = 0;

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
                    if (log.imageUrl) mediaUrlsToDelete.push(log.imageUrl);
                });
            });

            await deleteStoredMedia(mediaUrlsToDelete);
            mediaUrlsToDelete.length = 0;

            // 2. Delete DB records
            await db.habit.deleteMany({ where: { productId: id } });
        }

        await deleteStoredMedia(mediaUrlsToDelete);

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
    const session = await getSession();
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
    const session = await getSession();
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
