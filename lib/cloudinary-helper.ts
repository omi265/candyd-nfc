import cloudinary from "@/lib/cloudinary";
import { extractPublicId } from "./media-helper";

export { extractPublicId };

/**
 * Validates that a URL is a valid Cloudinary URL
 * Accepts both res.cloudinary.com and cloudinary CDN URLs
 */
export function isValidCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    const isProtected = url.includes('/authenticated/') || url.includes('/authenticated/');
    const parsed = new URL(url);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    // Check for standard Cloudinary domains
    const validHosts = [
      "res.cloudinary.com",
      `res-${cloudName}.cloudinary.com`,
    ];

    // Also allow cloudinary CDN patterns
    if (validHosts.some((host) => parsed.hostname === host)) {
      return true;
    }

    // Check if path contains the cloud name (for CDN URLs)
    if (
      parsed.hostname.endsWith(".cloudinary.com") &&
      cloudName &&
      parsed.pathname.includes(`/${cloudName}/`)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates an array of media URLs, returns only valid Cloudinary URLs
 */
export function filterValidCloudinaryUrls(urls: string[]): string[] {
  return urls.filter(isValidCloudinaryUrl);
}

export async function deleteFromCloudinary(publicIds: string[]) {
    if (publicIds.length === 0) return;
    
    try {
        console.log("Deleting from Cloudinary:", publicIds);
        
        // Optimize: Run deletions in parallel
        await Promise.all([
            cloudinary.api.delete_resources(publicIds, { resource_type: 'image' }).catch(e => console.error("Failed to delete images", e)),
            cloudinary.api.delete_resources(publicIds, { resource_type: 'video' }).catch(e => console.error("Failed to delete videos", e)),
            cloudinary.api.delete_resources(publicIds, { resource_type: 'raw' }).catch(e => console.error("Failed to delete raw files", e))
        ]);

    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
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

export function getSignedUrlFromCloudinaryUrl(url: string, resourceType: string = "image", width?: number) {
  if (!url || !url.includes("cloudinary.com")) return url;
  
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

  // If it's still 'upload', we don't strictly NEED to sign it, 
  // but signing it doesn't hurt and prepares it for the migration.
  return generateSignedUrl(publicId, normalizedType, deliveryType, width);
}
