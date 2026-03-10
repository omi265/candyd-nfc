"use server";

import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import cloudinary from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";

export async function getProductOwnerInfo(token: string) {
  try {
    const product = await db.product.findUnique({
      where: { token },
      include: { user: { select: { email: true, name: true, setupRequired: true } } }
    });

    if (!product || !product.active) {
      return null;
    }

    if (!product.userId || !product.user) {
        return { unassigned: true, type: product.type, charmName: product.name };
    }

    return {
      email: product.user.email,
      name: product.user.name,
      setupRequired: product.user.setupRequired
    };
  } catch (error) {
    console.error("Failed to get product owner info:", error);
    return null;
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

        // Check if user exists or create new
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

        // Link product to user
        await db.product.update({
            where: { token },
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
            select: { id: true, active: true }
        });

        if (!product || !product.active) {
            throw new Error("Invalid or inactive tag");
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = "candyd_guest_memories";

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
            },
            process.env.CLOUDINARY_API_SECRET!
        );

        return {
            signature,
            timestamp,
            folder,
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
            select: { id: true, userId: true, active: true }
        });

        if (!product || !product.active || !product.userId) {
            return { error: "Invalid tag" };
        }

        const memory = await db.memory.create({
            data: {
                title: data.title || "Quick Capture",
                description: "Captured via Quick Access",
                date: new Date(),
                userId: product.userId,
                productId: product.id,
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
                userId: true
            }
        });

        if (!product || !product.active || !product.userId) {
            return null;
        }

        if (product.type === "LIFE") {
            // Fetch liked experiences for Life Charms
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
                    }
                },
                orderBy: { date: 'desc' }
            });

            return {
                name: product.name,
                type: "LIFE",
                items: experiences.map(e => ({
                    id: e.id,
                    title: e.reflection || "An Experience",
                    date: e.date,
                    location: e.location,
                    media: e.media.map(m => ({
                        url: m.url,
                        type: m.type
                    }))
                }))
            };
        }

        // Habit charms don't have a public showcase yet
        return null;
    } catch (error) {
        console.error("Failed to fetch public charm data:", error);
        return null;
    }
}
