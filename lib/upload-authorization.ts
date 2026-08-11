import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export type UploadAuthorization =
  | { kind: "user"; userId: string; scope: string }
  | { kind: "guest"; productId: string; scope: string };

export async function resolveUploadAuthorization(guestToken?: string): Promise<UploadAuthorization | null> {
  const session = await getSession();
  if (guestToken) {
    const product = await db.product.findUnique({
      where: { token: guestToken },
      select: { id: true, userId: true, active: true, allowGuestUploads: true },
    });

    const isOwner = Boolean(product?.userId && session?.user?.id === product.userId);
    const isUnassigned = Boolean(product && !product.userId);
    if (!product?.active || (!isOwner && !isUnassigned && !product.allowGuestUploads)) {
      return null;
    }

    return {
      kind: "guest",
      productId: product.id,
      scope: `guests/${product.id}`,
    };
  }

  if (!session?.user?.id) return null;
  return {
    kind: "user",
    userId: session.user.id,
    scope: `users/${session.user.id}`,
  };
}
