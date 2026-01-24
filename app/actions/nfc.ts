"use server";

import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export async function getProductOwnerInfo(token: string) {
  try {
    const product = await db.product.findUnique({
      where: { token },
      include: { user: { select: { email: true, name: true, setupRequired: true } } }
    });

    if (!product || !product.active || !product.user) {
      return null;
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

export async function completeUserSetup(token: string, name: string, password: string) {
    try {
        const product = await db.product.findUnique({
            where: { token },
            select: { userId: true, user: { select: { setupRequired: true } } }
        });

        if (!product || !product.user?.setupRequired) {
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
