"use server";

import cloudinary from "@/lib/cloudinary";
import { auth } from "@/auth";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";

export async function getCloudinarySignature(folder: string = "candyd_memories") {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const type = "upload";

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      type,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    folder,
    type,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
}

export async function deleteUploadedFile(url: string) {
  const session = await auth();

    if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const publicId = extractPublicId(url);
  if (publicId) {
    await deleteFromCloudinary([publicId]);
  }
}
