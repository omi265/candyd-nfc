"use server";

import cloudinary from "@/lib/cloudinary";
import { getSession } from "@/lib/session";
import { extractPublicId } from "@/lib/cloudinary-helper";
import { validateMediaMetadata } from "@/lib/media-validation";
import { resolveUploadAuthorization } from "@/lib/upload-authorization";
import { deleteStoredMedia } from "@/lib/media-storage";
import { extractRailwayFileKey } from "@/lib/media-url";

export async function getCloudinarySignature(folder: string = "candyd_memories") {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const type = "authenticated";
  const scopedFolder = `${folder}/${session.user.id}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: scopedFolder,
      type,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    folder: scopedFolder,
    type,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
}

import { getRailwayPresignedUploadUrl } from "@/lib/storage";

export async function getStorageUploadPresignedUrl(filename: string, contentType: string, size: number) {
  const validation = validateMediaMetadata(contentType, size);
  if (!validation.valid) throw new Error(validation.error);

  const authorization = await resolveUploadAuthorization();
  if (!authorization) throw new Error("Unauthorized");

  return getRailwayPresignedUploadUrl(filename, contentType, size, authorization.scope);
}

export async function getGuestStorageUploadPresignedUrl(
  guestToken: string,
  filename: string,
  contentType: string,
  size: number
) {
  const validation = validateMediaMetadata(contentType, size);
  if (!validation.valid) throw new Error(validation.error);

  const authorization = await resolveUploadAuthorization(guestToken);
  if (!authorization) throw new Error("Guest uploads are not authorized for this charm");

  return getRailwayPresignedUploadUrl(filename, contentType, size, authorization.scope);
}

export async function deleteUploadedFile(url: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const railwayKey = extractRailwayFileKey(url);
  const publicId = extractPublicId(url);
  const ownsUnattachedUpload = railwayKey?.startsWith(`uploads/users/${session.user.id}/`) ||
    publicId?.startsWith(`candyd_memories/${session.user.id}/`);

  if (!ownsUnattachedUpload) throw new Error("Unauthorized media deletion");
  await deleteStoredMedia([url]);
}
