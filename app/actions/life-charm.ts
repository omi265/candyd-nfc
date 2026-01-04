"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";
import { CharmType, CharmState } from "@prisma/client";

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

    // Create the life list
    const lifeList = await db.lifeList.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        productId,
        userId: session.user.id,
      },
    });

    // Add template items if provided
    if (data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        await db.lifeListItem.create({
          data: {
            title: data.items[i],
            lifeListId: lifeList.id,
            orderIndex: i,
          },
        });
      }
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
      data: {
        name: data.name,
        description: data.description,
      },
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
        title: data.title,
        description: data.description,
        peopleIds: data.peopleIds || [],
        whenType: data.whenType,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
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
    status?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

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
        title: data.title,
        description: data.description,
        peopleIds: data.peopleIds,
        whenType: data.whenType,
        targetDate: data.targetDate ? new Date(data.targetDate) : data.targetDate === null ? null : undefined,
        status: data.status,
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

    // Update order indices
    for (let i = 0; i < itemIds.length; i++) {
      await db.lifeListItem.update({
        where: { id: itemIds[i] },
        data: { orderIndex: i },
      });
    }

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
        reflection: data.reflection,
        location: data.location,
        date: new Date(data.date),
        peopleIds: data.peopleIds || [],
        itemId,
      },
    });

    // Add media
    if (data.mediaUrls && data.mediaUrls.length > 0) {
      for (let i = 0; i < data.mediaUrls.length; i++) {
        await db.experienceMedia.create({
          data: {
            url: data.mediaUrls[i],
            type: data.mediaTypes?.[i] || "image",
            size: data.mediaSizes?.[i] || 0,
            experienceId: experience.id,
            orderIndex: i,
          },
        });
      }
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
        reflection: data.reflection,
        location: data.location,
        date: data.date ? new Date(data.date) : undefined,
        peopleIds: data.peopleIds,
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

    for (let i = 0; i < media.length; i++) {
      await db.experienceMedia.create({
        data: {
          url: media[i].url,
          type: media[i].type,
          size: media[i].size,
          experienceId,
          orderIndex: maxIndex + 1 + i,
        },
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
