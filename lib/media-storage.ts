import { deleteFromCloudinary } from "@/lib/cloudinary-helper";
import { extractPublicId } from "@/lib/media-helper";
import { extractRailwayFileKey } from "@/lib/media-url";
import { deleteFromRailwayStorage } from "@/lib/storage";

export async function deleteStoredMedia(urls: string[]) {
  const railwayKeys = new Set<string>();
  const cloudinaryIds = new Set<string>();

  for (const url of urls) {
    const railwayKey = extractRailwayFileKey(url);
    if (railwayKey) {
      railwayKeys.add(railwayKey);
      continue;
    }

    if (url.includes("cloudinary.com")) {
      const publicId = extractPublicId(url);
      if (publicId) cloudinaryIds.add(publicId);
    }
  }

  await Promise.all(Array.from(railwayKeys, (key) => deleteFromRailwayStorage(key)));
  await deleteFromCloudinary(Array.from(cloudinaryIds));
}
