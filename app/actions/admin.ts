"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getCloudinaryUsage } from "@/lib/cloudinary-helper";

export async function getAdminStats() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  try {
    const displayUserCount = await db.user.count();
    const productCount = await db.product.count();
    const memoryCount = await db.memory.count();
    const lifeListCount = await db.lifeList.count();
    const lifeListItemCount = await db.lifeListItem.count();

    // Count by charm type
    const charmTypeCounts = await db.product.groupBy({
      by: ["type"],
      _count: true,
    });

    const memoryCharmCount = charmTypeCounts.find((c) => c.type === "MEMORY")?._count || 0;
    const lifeCharmCount = charmTypeCounts.find((c) => c.type === "LIFE")?._count || 0;
    const habitCharmCount = charmTypeCounts.find((c) => c.type === "HABIT")?._count || 0;

    // Get actual Cloudinary usage
    const totalStorage = await getCloudinaryUsage();

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
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    // Return empty stats instead of crashing the page if it's a transient DB error
    return {
      userCount: 0,
      productCount: 0,
      memoryCount: 0,
      lifeListCount: 0,
      lifeListItemCount: 0,
      memoryCharmCount: 0,
      lifeCharmCount: 0,
      habitCharmCount: 0,
      totalStorage: 0,
    };
  }
}

export async function getAllUsers() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: {
      email: "asc",
    },
  });
}

export async function createProduct(
  email: string,
  productName: string = "New Charm",
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

  // First, batch update any products missing guestToken (runs once, then no-op)
  const productsWithoutToken = await db.product.findMany({
    where: { guestToken: null },
    select: { id: true },
  });

  if (productsWithoutToken.length > 0) {
    // Update each product with a unique token using a transaction
    await db.$transaction(
      productsWithoutToken.map((p) =>
        db.product.update({
          where: { id: p.id },
          data: { guestToken: crypto.randomUUID() },
        })
      )
    );
  }

  // Now fetch all products with their tokens guaranteed
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

  return products;
}
