"use server";

import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import cloudinary from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { LRUCache } from "lru-cache";
import { getSignedUrlFromCloudinaryUrl } from "@/lib/cloudinary-helper";

// Simple in-memory rate limiter
const rateLimiter = new LRUCache<string, number>({
  max: 1000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

function isRateLimited(ip: string, limit: number = 20): boolean {
  const current = rateLimiter.get(ip) || 0;
  if (current >= limit) return true;
  rateLimiter.set(ip, current + 1);
  return false;
}

function maskEmail(email: string): string {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
}

export async function getProductOwnerInfo(token: string) {
  try {
    const product = await db.product.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, name: true, setupRequired: true } } }
    });

    if (!product || !product.active) {
      return null;
    }

    if (!product.userId || !product.user) {
        return { unassigned: true, type: product.type, charmName: product.name };
    }

    const session = await getSession();
    const isOwner = session?.user?.id === product.user.id;

    return {
      email: isOwner ? product.user.email : maskEmail(product.user.email),
      name: product.user.name,
      setupRequired: product.user.setupRequired,
      isOwner,
      enableGuestUploadButton: product.enableGuestUploadButton
    };
  } catch (error) {
    console.error("Failed to get product owner info:", error);
    return null;
  }
}

export async function verifyGuestUploadPassword(token: string, password: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { guestUploadPassword: true }
        });

        if (!product) return { error: "Invalid token" };
        if (product.guestUploadPassword === password) {
            return { success: true };
        }
        return { error: "Incorrect password" };
    } catch (error) {
        console.error("Verify Guest Password Error:", error);
        return { error: "Verification failed" };
    }
}

export async function claimProduct(token: string, userData: { email: string, name: string, password: string }) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true, userId: true }
        });

        if (!product || product.userId) {
            return { error: "Product not found or already claimed." };
        }

        let user = await db.user.findUnique({
            where: { email: userData.email }
        });

        if (!user) {
            const hashedPassword = await hash(userData.password, 10);
            user = await db.user.create({
                data: {
                    email: userData.email,
                    name: userData.name,
                    password: hashedPassword,
                    setupRequired: false
                }
            });
        }

        await db.product.update({
            where: { token },
            data: { userId: user.id }
        });

        await db.memory.updateMany({
            where: { productId: product.id, userId: null },
            data: { userId: user.id }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to claim product:", error);
        return { error: "Claim failed" };
    }
}

export async function completeUserSetup(token: string, name: string, password: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { userId: true, user: { select: { setupRequired: true } } }
        });

        if (!product || !product.userId || !product.user?.setupRequired) {
            return { error: "Invalid request or account already set up." };
        }

        const hashedPassword = await hash(password, 10);

        await db.user.update({
            where: { id: product.userId },
            data: {
                name,
                password: hashedPassword,
                setupRequired: false
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to complete setup:", error);
        return { error: "Setup failed" };
    }
}

export async function getGuestCloudinarySignature(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true, active: true, allowGuestUploads: true, userId: true }
        });

        if (!product || !product.active) {
            throw new Error("Invalid or inactive tag");
        }

        if (!product.allowGuestUploads && product.userId) {
            throw new Error("Guest uploads are disabled for this charm");
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = "candyd_guest_memories";
        const type = "authenticated";

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
                type,
            },
            process.env.CLOUDINARY_API_SECRET!
        );

        return {
            signature,
            timestamp,
            folder,
            type,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
        };
    } catch (error) {
        console.error("Guest signature failed:", error);
        return null;
    }
}

export async function createGuestMemory(token: string, data: {
    title: string;
    mediaUrl: string;
    mediaType: string;
    mediaSize: number;
}) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true, userId: true, active: true, autoApproveGuestUploads: true }
        });

        if (!product || !product.active) {
            return { error: "Invalid tag" };
        }

        const memory = await db.memory.create({
            data: {
                title: data.title || "Quick Capture",
                description: "Captured via Quick Access",
                date: new Date(),
                userId: product.userId || null,
                productId: product.id,
                isLiked: product.autoApproveGuestUploads,
                emotions: [],
                events: [],
                peopleIds: []
            }
        });

        await db.media.create({
            data: {
                url: data.mediaUrl,
                type: data.mediaType,
                size: data.mediaSize,
                memoryId: memory.id,
                orderIndex: 0
            }
        });

        revalidatePath("/");
        return { success: true, memoryId: memory.id };
    } catch (error) {
        console.error("Guest memory creation failed:", error);
        return { error: "Failed to save memory" };
    }
}

export async function getPublicCharmShowcase(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { 
                id: true, 
                name: true, 
                type: true,
                active: true,
                userId: true,
                enableGuestUploadButton: true
            }
        });

        if (!product || !product.active) {
            return null;
        }

        if (product.type === "LIFE" || product.type === "MEMORY") {
            const experiences = await db.experience.findMany({
                where: {
                    item: {
                        lifeList: {
                            productId: product.id
                        }
                    },
                    isLiked: true
                },
                include: {
                    media: {
                        orderBy: { orderIndex: 'asc' }
                    },
                    item: {
                        select: { title: true }
                    }
                },
                orderBy: { date: 'desc' }
            });

            const memories = await db.memory.findMany({
                where: {
                    productId: product.id,
                    isLiked: true
                },
                include: {
                    media: {
                        orderBy: { orderIndex: 'asc' }
                    }
                },
                orderBy: { date: 'desc' }
            });

            const unifiedItems = [
                ...experiences.map(e => ({
                    id: e.id,
                    type: 'life_item',
                    title: e.item.title,
                    description: e.reflection,
                    date: e.date,
                    location: e.location,
                    events: [e.item.title],
                    peopleIds: e.peopleIds,
                    media: e.media.map(m => ({
                        id: m.id,
                        url: getSignedUrlFromCloudinaryUrl(m.url, m.type, m.type.startsWith('image') ? 1080 : undefined),
                        type: m.type,
                        posterUrl: m.type === 'video' ? getSignedUrlFromCloudinaryUrl(m.url, 'video-thumbnail', 600) : undefined
                    })),
                    isLiked: true
                })),
                ...memories.map(m => ({
                    id: m.id,
                    type: 'memory',
                    title: m.title,
                    description: m.description,
                    date: m.date,
                    location: m.location,
                    events: m.events,
                    peopleIds: m.peopleIds,
                    media: m.media.map(media => ({
                        id: media.id,
                        url: getSignedUrlFromCloudinaryUrl(media.url, media.type),
                        type: media.type,
                        posterUrl: media.type === 'video' ? getSignedUrlFromCloudinaryUrl(media.url, 'video-thumbnail') : undefined
                    })),
                    isLiked: true
                }))
            ];

            unifiedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return {
                name: product.name,
                type: product.type,
                items: unifiedItems,
                enableGuestUploadButton: product.enableGuestUploadButton
            };
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch public charm data:", error);
        return null;
    }
}

export async function getGifterProduct(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { 
                id: true, 
                name: true, 
                type: true,
                active: true,
                userId: true
            }
        });

        if (!product || !product.active) {
            return { error: "Charm not found or inactive." };
        }

        if (product.type === "HABIT") {
            return { error: "Gifter uploads are not supported for Habit charms." };
        }

        return { 
            id: product.id, 
            name: product.name, 
            type: product.type,
            isAssigned: !!product.userId
        };
    } catch (error) {
        console.error("Failed to get gifter product:", error);
        return { error: "Something went wrong." };
    }
}

export async function createGifterFullMemory(token: string, data: {
    title: string;
    description?: string;
    date: string;
    media: { url: string; type: string; size: number }[];
    mood?: string;
    emotions?: string[];
}) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true, userId: true, active: true }
        });

        if (!product || !product.active) {
            return { error: "Invalid charm." };
        }

        const memory = await db.memory.create({
            data: {
                title: data.title,
                description: data.description || "Pre-loaded Memory",
                date: new Date(data.date),
                userId: product.userId || null,
                productId: product.id,
                mood: data.mood || null,
                emotions: data.emotions || [],
                events: [],
                peopleIds: [],
                isLiked: true,
                media: {
                    create: data.media.map((m, index) => ({
                        url: m.url,
                        type: m.type,
                        size: m.size,
                        orderIndex: index
                    }))
                }
            }
        });

        revalidatePath("/");
        return { success: true, memoryId: memory.id };
    } catch (error) {
        console.error("Gifter full memory creation failed:", error);
        return { error: "Failed to save memory." };
    }
}

export async function getGifterMemories(token: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { id: true, active: true }
        });

        if (!product || !product.active) {
            return null;
        }

        const memories = await db.memory.findMany({
            where: { productId: product.id },
            include: { media: true },
            orderBy: { date: 'desc' }
        });

        return memories.map(memory => ({
            ...memory,
            media: memory.media.map(m => ({
                ...m,
                url: getSignedUrlFromCloudinaryUrl(m.url, m.type, m.type.startsWith('image') ? 1080 : undefined),
                posterUrl: m.type === 'video' ? getSignedUrlFromCloudinaryUrl(m.url, 'video-thumbnail', 600) : undefined
            }))
        }));
    } catch (error) {
        console.error("Failed to fetch gifter memories:", error);
        return null;
    }
}
