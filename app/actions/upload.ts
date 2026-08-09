"use server";

import cloudinary from "@/lib/cloudinary";
import { getSession } from "@/lib/session";
import { extractPublicId, deleteFromCloudinary } from "@/lib/cloudinary-helper";

export async function getCloudinarySignature(folder: string = "candyd_memories") {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const type = "authenticated";

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

import { getRailwayPresignedUploadUrl, deleteFromRailwayStorage } from "@/lib/storage";

export async function getStorageUploadPresignedUrl(filename: string, contentType: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return getRailwayPresignedUploadUrl(filename, contentType);
}

export async function deleteUploadedFile(url: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (process.env.RAILWAY_STORAGE_PUBLIC_URL && url.startsWith(process.env.RAILWAY_STORAGE_PUBLIC_URL)) {
    const fileKey = url.replace(`${process.env.RAILWAY_STORAGE_PUBLIC_URL}/`, "");
    await deleteFromRailwayStorage(fileKey);
    return;
  }

  const publicId = extractPublicId(url);
  if (publicId) {
    await deleteFromCloudinary([publicId]);
  }
}
