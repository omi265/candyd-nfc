"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getAdminStats() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const [displayUserCount, productCount, memoryCount] = await Promise.all([
    db.user.count(),
    db.product.count(),
    db.memory.count(),
  ]);

  // Aggregate media size
  const mediaSize = await db.media.aggregate({
    _sum: {
      size: true,
    },
  });

  return {
    userCount: displayUserCount,
    productCount,
    memoryCount,
    totalStorage: mediaSize._sum?.size ?? 0,
  };
}

export async function createProduct(email: string, productName: string) {
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
