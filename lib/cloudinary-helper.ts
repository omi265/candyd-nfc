import cloudinary from "@/lib/cloudinary";

export { extractPublicId } from "./media-helper";

/**
 * Validates that a URL is a valid Cloudinary URL
 * Accepts both res.cloudinary.com and cloudinary CDN URLs
 */
export function isValidCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
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
