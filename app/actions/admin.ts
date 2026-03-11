"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getCloudinaryUsage } from "@/lib/cloudinary-helper";
import { hash } from "bcryptjs";

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
  email?: string,
  productName: string = "New Charm",
  charmType: "LIFE" | "HABIT" = "LIFE"
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  let userId: string | null = null;

  if (email) {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found" };
    }
    userId = user.id;
  }

  // Generate a unique token
  const token = crypto.randomUUID();

  try {
    const product = await db.product.create({
      data: {
        name: productName,
        token,
        userId,
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

export async function generateBatchProducts(
    type: "LIFE" | "HABIT",
    count: number,
    baseName: string = "Candyd Charm"
) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { error: "Unauthorized" };
    }

    try {
        const products = [];
        for (let i = 0; i < count; i++) {
            products.push({
                name: `${baseName} ${Math.floor(Math.random() * 10000)}`,
                token: crypto.randomUUID(),
                type,
                active: true
            });
        }

        await db.product.createMany({
            data: products
        });

        revalidatePath("/admin");
        return { success: true, count };
    } catch (error) {
        console.error("Batch creation failed:", error);
        return { error: "Failed to generate batch" };
    }
}

export async function createUserAndProduct(
  email: string,
  productName: string = "New Charm",
  charmType: "LIFE" | "HABIT" | "MEMORY" = "LIFE"
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  // Check if user exists
  let user = await db.user.findUnique({
    where: { email },
  });

  let isNewUser = false;

  if (!user) {
    // Create new user with default password
    const hashedPassword = await hash("candyd123", 10);
    try {
            user = await db.user.create({
              data: {
                email,
                password: hashedPassword,
                name: email.split("@")[0], // Default name from email part
                setupRequired: true,
              },
            });
            isNewUser = true;    } catch {
        return { error: "Failed to create user" };
    }
  }

  // Generate a unique token
  const token = crypto.randomUUID();

  try {
    const product = await db.product.create({
      data: {
        name: productName,
        token,
        userId: user.id,
        type: charmType,
      },
    });

    revalidatePath("/admin");
    return { success: true, product, isNewUser };
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

export async function deleteProduct(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    // Delete associated data first if not cascaded by DB
    // Habits and LifeLists are not currently onDelete: Cascade in the schema for Product
    await db.habit.deleteMany({ where: { productId: id } });
    await db.lifeList.deleteMany({ where: { productId: id } });
    // Memories are SetNull so they don't need deletion here, unless desired

    await db.product.delete({
      where: { id },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Delete product failed:", error);
    return { error: "Failed to delete product" };
  }
}
