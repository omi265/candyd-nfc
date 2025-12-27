"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getAdminStats() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const [displayUserCount, productCount, memoryCount, lifeListCount, lifeListItemCount] = await Promise.all([
    db.user.count(),
    db.product.count(),
    db.memory.count(),
    db.lifeList.count(),
    db.lifeListItem.count(),
  ]);

  // Count by charm type
  const charmTypeCounts = await db.product.groupBy({
    by: ["type"],
    _count: true,
  });

  const memoryCharmCount = charmTypeCounts.find((c) => c.type === "MEMORY")?._count || 0;
  const lifeCharmCount = charmTypeCounts.find((c) => c.type === "LIFE")?._count || 0;
  const habitCharmCount = charmTypeCounts.find((c) => c.type === "HABIT")?._count || 0;

  // Aggregate media size
  const mediaSize = await db.media.aggregate({
    _sum: {
      size: true,
    },
  });

  // Aggregate experience media size
  const experienceMediaSize = await db.experienceMedia.aggregate({
    _sum: {
      size: true,
    },
  });

  const totalStorage = (mediaSize._sum?.size ?? 0) + (experienceMediaSize._sum?.size ?? 0);

  return {
    userCount: displayUserCount,
    productCount,
    memoryCount,
    lifeListCount,
    lifeListItemCount,
    memoryCharmCount,
    lifeCharmCount,
    habitCharmCount,
    totalStorage,
  };
}

export async function createProduct(
  email: string,
  productName: string,
  charmType: "MEMORY" | "LIFE" | "HABIT" = "MEMORY"
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "User not found" };
  }

  // Generate a unique token
  const token = crypto.randomUUID();
  const guestToken = crypto.randomUUID();

  try {
    const product = await db.product.create({
      data: {
        name: productName,
        token,
        guestToken,
        userId: user.id,
        type: charmType,
      },
    });

    revalidatePath("/admin");
    return { success: true, product };
  } catch (err) {
    console.error(err);
    return { error: "Failed to create product" };
  }
}

export async function getProducts() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const products = await db.product.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Lazy backfill for existing products
  const productsWithGuestToken = await Promise.all(products.map(async (p) => {
    if (!p.guestToken) {
        const guestToken = crypto.randomUUID();
        return await db.product.update({
            where: { id: p.id },
            data: { guestToken },
            include: { user: { select: { email: true, name: true } } }
        });
    }
    return p;
  }));

  return productsWithGuestToken;
}
