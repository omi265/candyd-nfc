"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";
import { CharmType, CharmState } from "@prisma/client";
import {
  createLifeListSchema,
  updateLifeListSchema,
  createLifeListItemSchema,
  updateLifeListItemSchema,
  markAsLivedSchema,
  updateExperienceSchema
} from "@/lib/schemas";

// ===========================================
// PRODUCT / CHARM TYPE HELPERS
// ===========================================

export async function getProductWithType(token: string) {
  try {
    // Only return minimal info needed for routing - no sensitive data
    // Name is only included if the user will be authenticated via this token
    const product = await db.product.findUnique({
      where: { token },
      select: {
        id: true,
        type: true,
        state: true,
        name: true,
        active: true,
      },
    });

    // Don't expose info for inactive products
    if (!product || !product.active) {
      return null;
    }

    return product;
  } catch (error) {
    console.error("Failed to get product with type:", error);
    return null;
  }
}

export async function getProductById(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        lifeLists: {
          include: {
            items: {
              orderBy: { orderIndex: "asc" },
              include: {
                experience: {
                  include: {
                    media: { orderBy: { orderIndex: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product || product.userId !== session.user.id) return null;
    return product;
  } catch (error) {
    console.error("Failed to get product:", error);
    return null;
  }
}

export async function updateProduct(productId: string, data: { name: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.product.update({
      where: { id: productId },
      data: { name: data.name },
    });

    revalidatePath("/");
    revalidatePath("/manage-charms");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ===========================================
// LIFE LIST CRUD
// ===========================================

export async function createLifeList(
  productId: string,
  data: {
    name: string;
    description?: string;
    template?: string;
    items?: string[]; // Array of item titles from template
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = createLifeListSchema.safeParse(data);
  if (!validated.success) {
      return { error: "Invalid data: " + validated.error.issues.map(i => i.message).join(", ") };
  }
  const { name, description, template, items } = validated.data;

  try {
    // Verify product ownership and type
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, type: true },
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (product.type !== "LIFE") {
      return { error: "This charm is not a Life Charm" };
    }

    // Update product name as well (moving naming to setup)
    await db.product.update({
        where: { id: productId },
        data: { name: name }
    });

    // Create the life list
    const lifeList = await db.lifeList.create({
      data: {
        name,
        description,
        template,
        productId,
        userId: session.user.id,
      },
    });

    // Add template items if provided - Optimized with createMany
    if (items && items.length > 0) {
      await db.lifeListItem.createMany({
        data: items.map((title, i) => ({
          title,
          lifeListId: lifeList.id,
          orderIndex: i,
        })),
      });
    }

    revalidatePath(`/life-charm`);
    return { success: true, lifeListId: lifeList.id };
  } catch (error: any) {
    console.error("Create LifeList Error:", error);
    return { error: error.message };
  }
}

export async function getLifeList(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const lifeList = await db.lifeList.findFirst({
      where: {
        productId,
        userId: session.user.id,
      },
      include: {
        items: {
          orderBy: { orderIndex: "asc" },
          include: {
            experience: {
              include: {
                media: { orderBy: { orderIndex: "asc" } },
              },
            },
          },
        },
      },
    });

    return lifeList;
  } catch (error) {
    console.error("Failed to get life list:", error);
    return null;
  }
}

export async function updateLifeList(
  listId: string,
  data: { name?: string; description?: string }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = updateLifeListSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }

  try {
    const lifeList = await db.lifeList.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!lifeList || lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.lifeList.update({
      where: { id: listId },
      data: validated.data,
    });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Update LifeList Error:", error);
    return { error: error.message };
  }
}

// ===========================================
// LIFE LIST ITEM CRUD
// ===========================================

export async function addListItem(
  listId: string,
  data: {
    title: string;
    description?: string;
    peopleIds?: string[];
    whenType?: string;
    targetDate?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = createLifeListItemSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { title, description, peopleIds, whenType, targetDate } = validated.data;

  try {
    const lifeList = await db.lifeList.findUnique({
      where: { id: listId },
      select: { userId: true, items: { select: { orderIndex: true } } },
    });

    if (!lifeList || lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    // Get next order index
    const maxIndex = lifeList.items.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1
    );

    const item = await db.lifeListItem.create({
      data: {
        title,
        description,
        peopleIds: peopleIds || [],
        whenType,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        lifeListId: listId,
        orderIndex: maxIndex + 1,
      },
    });

    revalidatePath(`/life-charm`);
    return { success: true, itemId: item.id };
  } catch (error: any) {
    console.error("Add ListItem Error:", error);
    return { error: error.message };
  }
}

export async function getListItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const item = await db.lifeListItem.findUnique({
      where: { id: itemId },
      include: {
        lifeList: { select: { userId: true, productId: true } },
        experience: {
          include: {
            media: { orderBy: { orderIndex: "asc" } },
          },
        },
      },
    });

    if (!item || item.lifeList.userId !== session.user.id) return null;
    return item;
  } catch (error) {
    console.error("Failed to get list item:", error);
    return null;
  }
}

export async function updateListItem(
  itemId: string,
  data: {
    title?: string;
    description?: string;
    peopleIds?: string[];
    whenType?: string;
    targetDate?: string | null;
    status?: string; // We map string to Zod enum below
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = updateLifeListItemSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { title, description, peopleIds, whenType, targetDate, status } = validated.data;

  try {
    const item = await db.lifeListItem.findUnique({
      where: { id: itemId },
      include: { lifeList: { select: { userId: true, productId: true } } },
    });

    if (!item || item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.lifeListItem.update({
      where: { id: itemId },
      data: {
        title,
        description,
        peopleIds,
        whenType,
        targetDate: targetDate ? new Date(targetDate) : targetDate === null ? null : undefined,
        status,
      },
    });

    revalidatePath(`/life-charm`);
    revalidatePath(`/life-charm/item/${itemId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update ListItem Error:", error);
    return { error: error.message };
  }
}

export async function deleteListItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const item = await db.lifeListItem.findUnique({
      where: { id: itemId },
      include: {
        lifeList: { select: { userId: true } },
        experience: { include: { media: true } },
      },
    });

    if (!item || item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    // Delete media from Cloudinary if experience exists
    if (item.experience?.media && item.experience.media.length > 0) {
      const publicIds = item.experience.media
        .map((m) => extractPublicId(m.url))
        .filter((id): id is string => id !== null);

      if (publicIds.length > 0) {
        await deleteFromCloudinary(publicIds);
      }
    }

    await db.lifeListItem.delete({ where: { id: itemId } });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete ListItem Error:", error);
    return { error: error.message };
  }
}

export async function reorderListItems(listId: string, itemIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const lifeList = await db.lifeList.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!lifeList || lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    // Update order indices - Optimized with transaction
    await db.$transaction(
      itemIds.map((id, index) =>
        db.lifeListItem.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Reorder ListItems Error:", error);
    return { error: error.message };
  }
}

// ===========================================
// EXPERIENCE (MARK AS LIVED)
// ===========================================

export async function markAsLived(
  itemId: string,
  data: {
    reflection?: string;
    location?: string;
    date: string;
    peopleIds?: string[];
    mediaUrls?: string[];
    mediaTypes?: string[];
    mediaSizes?: number[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = markAsLivedSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { reflection, location, date, peopleIds, mediaUrls, mediaTypes, mediaSizes } = validated.data;

  try {
    const item = await db.lifeListItem.findUnique({
      where: { id: itemId },
      include: { lifeList: { select: { userId: true, productId: true } } },
    });

    if (!item || item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (item.status === "lived") {
      return { error: "Item already marked as lived" };
    }

    // Create experience
    const experience = await db.experience.create({
      data: {
        reflection,
        location,
        date: new Date(date),
        peopleIds: peopleIds || [],
        itemId,
      },
    });

    // Add media - Optimized with createMany
    if (mediaUrls && mediaUrls.length > 0) {
      await db.experienceMedia.createMany({
        data: mediaUrls.map((url, i) => ({
          url,
          type: mediaTypes?.[i] || "image",
          size: mediaSizes?.[i] || 0,
          experienceId: experience.id,
          orderIndex: i,
        })),
      });
    }

    // Update item status
    await db.lifeListItem.update({
      where: { id: itemId },
      data: {
        status: "lived",
        livedAt: new Date(),
      },
    });

    revalidatePath(`/life-charm`);
    revalidatePath(`/life-charm/item/${itemId}`);
    return { success: true, experienceId: experience.id };
  } catch (error: any) {
    console.error("Mark As Lived Error:", error);
    return { error: error.message };
  }
}

export async function getExperience(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const experience = await db.experience.findUnique({
      where: { itemId },
      include: {
        media: { orderBy: { orderIndex: "asc" } },
        item: {
          include: {
            lifeList: { select: { userId: true, productId: true } },
          },
        },
      },
    });

    if (!experience || experience.item.lifeList.userId !== session.user.id) {
      return null;
    }

    return experience;
  } catch (error) {
    console.error("Failed to get experience:", error);
    return null;
  }
}

export async function updateExperience(
  experienceId: string,
  data: {
    reflection?: string;
    location?: string;
    date?: string;
    peopleIds?: string[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validated = updateExperienceSchema.safeParse(data);
  if (!validated.success) {
      return { error: validated.error.issues[0].message };
  }
  const { reflection, location, date, peopleIds } = validated.data;


  try {
    const experience = await db.experience.findUnique({
      where: { id: experienceId },
      include: {
        item: {
          include: { lifeList: { select: { userId: true } } },
        },
      },
    });

    if (!experience || experience.item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    await db.experience.update({
      where: { id: experienceId },
      data: {
        reflection,
        location,
        date: date ? new Date(date) : undefined,
        peopleIds,
      },
    });

    revalidatePath(`/life-charm`);
    revalidatePath(`/life-charm/experience/${experienceId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update Experience Error:", error);
    return { error: error.message };
  }
}

export async function addExperienceMedia(
  experienceId: string,
  media: { url: string; type: string; size: number }[]
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const experience = await db.experience.findUnique({
      where: { id: experienceId },
      include: {
        media: { select: { orderIndex: true } },
        item: {
          include: { lifeList: { select: { userId: true } } },
        },
      },
    });

    if (!experience || experience.item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    const maxIndex = experience.media.reduce(
      (max, m) => Math.max(max, m.orderIndex),
      -1
    );

    // Optimized with createMany
    if (media.length > 0) {
      await db.experienceMedia.createMany({
        data: media.map((m, i) => ({
          url: m.url,
          type: m.type,
          size: m.size,
          experienceId,
          orderIndex: maxIndex + 1 + i,
        })),
      });
    }

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Add Experience Media Error:", error);
    return { error: error.message };
  }
}

export async function deleteExperienceMedia(mediaId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const media = await db.experienceMedia.findUnique({
      where: { id: mediaId },
      include: {
        experience: {
          include: {
            item: {
              include: { lifeList: { select: { userId: true } } },
            },
          },
        },
      },
    });

    if (!media || media.experience.item.lifeList.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    // Delete from Cloudinary
    const publicId = extractPublicId(media.url);
    if (publicId) {
      await deleteFromCloudinary([publicId]);
    }

    await db.experienceMedia.delete({ where: { id: mediaId } });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete Experience Media Error:", error);
    return { error: error.message };
  }
}

// ===========================================
// CHARM GRADUATION
// ===========================================

export async function graduateCharm(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, type: true, state: true },
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (product.type !== "LIFE") {
      return { error: "Only Life Charms can be graduated" };
    }

    if (product.state === "GRADUATED") {
      return { error: "Charm is already graduated" };
    }

    await db.product.update({
      where: { id: productId },
      data: {
        state: "GRADUATED",
        graduatedAt: new Date(),
      },
    });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Graduate Charm Error:", error);
    return { error: error.message };
  }
}

export async function reopenCharm(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true, state: true },
    });

    if (!product || product.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (product.state !== "GRADUATED") {
      return { error: "Charm is not graduated" };
    }

    await db.product.update({
      where: { id: productId },
      data: {
        state: "ACTIVE",
        graduatedAt: null,
      },
    });

    revalidatePath(`/life-charm`);
    return { success: true };
  } catch (error: any) {
    console.error("Reopen Charm Error:", error);
    return { error: error.message };
  }
}

// ===========================================
// STATS
// ===========================================

export async function getLifeCharmStats(productId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const lifeList = await db.lifeList.findFirst({
      where: { productId, userId: session.user.id },
      include: {
        items: {
          select: { status: true },
        },
      },
    });

    if (!lifeList) return null;

    const total = lifeList.items.length;
    const lived = lifeList.items.filter((i) => i.status === "lived").length;
    const pending = lifeList.items.filter((i) => i.status === "pending").length;
    const skipped = lifeList.items.filter((i) => i.status === "skipped").length;

    return {
      total,
      lived,
      pending,
      skipped,
      percentComplete: total > 0 ? Math.round((lived / total) * 100) : 0,
    };
  } catch (error) {
    console.error("Failed to get stats:", error);
    return null;
  }
}
