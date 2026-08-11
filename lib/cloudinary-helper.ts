import cloudinary from "@/lib/cloudinary";
import { extractPublicId } from "./media-helper";
import { getPrivateMediaPath, isCloudinaryMediaUrl } from "./media-url";

export { extractPublicId };

/**
 * Validates a persisted media URL.
 *
 * New Railway Storage uploads use the authenticated, same-origin media proxy,
 * while older uploads may still use absolute Cloudinary/storage URLs.
 */
export function isValidCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  return Boolean(getPrivateMediaPath(url) || isCloudinaryMediaUrl(url));
}

/**
 * Validates an array of media URLs, returns only valid Cloudinary URLs
 */
export function filterValidCloudinaryUrls(urls: string[]): string[] {
  return urls.filter(isValidCloudinaryUrl);
}

export async function deleteFromCloudinary(publicIds: string[]) {
    if (publicIds.length === 0) return;

    const results = await Promise.allSettled([
        cloudinary.api.delete_resources(publicIds, { resource_type: 'image' }),
        cloudinary.api.delete_resources(publicIds, { resource_type: 'video' }),
        cloudinary.api.delete_resources(publicIds, { resource_type: 'raw' }),
    ]);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
        console.error("Cloudinary deletion failed", failures);
        throw new Error("Failed to delete one or more Cloudinary media files");
    }
}

/**
 * Gets the actual storage usage from Cloudinary account
 * Returns usage in bytes
 */
export async function getCloudinaryUsage(): Promise<number> {
  try {
    const usage = await cloudinary.api.usage();
    return usage.storage.usage || 0;
  } catch (error) {
    console.error("Error fetching Cloudinary usage:", error);
    return 0;
  }
}

export function generateSignedUrl(publicId: string, resourceType: string = "image", deliveryType: string = "authenticated", width?: number) {
  if (!publicId) return "";

  const transformation: Record<string, string | number>[] = [
    { fetch_format: "auto", quality: "auto" }
  ];

  if (width) {
    transformation.push({ width, crop: "limit" });
  }
  
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    sign_url: true,
    transformation
  });
}

export async function getSignedUrlFromCloudinaryUrl(url: string, resourceType: string = "image", width?: number) {
  if (!url) return "";

  // Railway objects are always served through the app so access remains tied
  // to the current session/public-showcase authorization.
  const privateMediaPath = getPrivateMediaPath(url);
  if (privateMediaPath) return privateMediaPath;

  if (!url.includes("cloudinary.com")) return url;
  
  const publicId = extractPublicId(url);
  if (!publicId) return url;

  // Detect delivery type from URL
  let deliveryType = "upload";
  if (url.includes("/private/")) deliveryType = "private";
  else if (url.includes("/authenticated/")) deliveryType = "authenticated";

  if (resourceType === "video-thumbnail") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      type: deliveryType,
      secure: true,
      sign_url: true,
      transformation: [
        { fetch_format: "auto", quality: "auto" },
        ...(width ? [{ width, crop: "limit" }] : [])
      ]
    });
  }

  // Normalize audio to video for Cloudinary
  const normalizedType = resourceType === "audio" ? "video" : resourceType;

  return generateSignedUrl(publicId, normalizedType, deliveryType, width);
}
