"use server";

import { db } from "@/lib/db";

export async function getProductOwnerInfo(token: string) {
  try {
    const product = await db.product.findUnique({
      where: { token },
      include: { user: { select: { email: true, name: true } } }
    });

    if (!product || !product.active || !product.user) {
      return null;
    }

    return {
      email: product.user.email,
      name: product.user.name
    };
  } catch (error) {
    console.error("Failed to get product owner info:", error);
    return null;
  }
}
