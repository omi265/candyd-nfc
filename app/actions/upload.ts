"use server";

import cloudinary from "@/lib/cloudinary";
import { auth } from "@/auth";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";
import { getGuestSession } from "@/app/actions/guest"; // Import guest session checker

export async function getCloudinarySignature(folder: string = "candyd_memories") {
  const session = await auth();
  const guestId = await getGuestSession();

  if (!session?.user?.id && !guestId) {
    throw new Error("Unauthorized");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);

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
}

export async function deleteUploadedFile(url: string) {
  const session = await auth();
  const guestId = await getGuestSession();

    if (!session?.user?.id && !guestId) {
    throw new Error("Unauthorized");
  }

  const publicId = extractPublicId(url);
  if (publicId) {
    await deleteFromCloudinary([publicId]);
  }
}
