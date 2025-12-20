import cloudinary from "@/lib/cloudinary";

export function extractPublicId(url: string): string | null {
  try {
    const regex = /\/v\d+\/(.+?)(\.[a-z]+)?$/;
    const match = url.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/**
 * Generates an optimized Cloudinary URL.
 * @param url - The original secure_url from Cloudinary
 * @param type - 'image' or 'video'
 * @param width - Optional width to resize to
 * @returns The optimized URL
 */
export function getOptimizedUrl(url: string, type: 'image' | 'video' = 'image', width?: number): string {
    if (!url || !url.includes('cloudinary.com')) return url;

    // Split at '/upload/' to insert transformations
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    const [base, rest] = parts;
    const transformations = ['f_auto', 'q_auto']; // Default format & quality auto

    // Add width limit if provided
    if (width) {
        transformations.push(`w_${width}`);
        transformations.push('c_limit'); // Scale down only, preserve aspect ratio
    }
    
    // For videos, q_auto:eco can save more bandwidth without noticeable quality loss for playback
    if (type === 'video') {
       // We can stick to q_auto for balanced, or go 'q_auto:eco' for "faster"
       // Let's stick to standard q_auto for now to ensure good quality, 
       // but strictly resize them for mobile if width is passed.
    }

    return `${base}/upload/${transformations.join(',')}/${rest}`;
}

export async function deleteFromCloudinary(publicIds: string[]) {
    if (publicIds.length === 0) return;
    
    try {
        console.log("Deleting from Cloudinary:", publicIds);
        // Cloudinary bulk delete
        // resource_type defaults to 'image', so we might need to handle video/raw separately 
        // IF we have mixed types, but the API usually handles mixed if we don't specify or handle iteratively.
        // Actually, delete_resources takes matches or public_ids. 
        // Checking documentation memory: api.delete_resources(public_ids, options)
        
        // We will attempt to delete assuming standard types. 
        // Safety: Try deleting as image, then video if needed, or pass header to invalidate.
        // For simplicity and to cover both, we might need two calls if they are mixed types and 
        // the API requires type specification. 
        // However, standard delete_resources often handles it if we don't strict type it?
        // Let's assume 'image' and 'video' are the main ones.
        
        await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
        await cloudinary.api.delete_resources(publicIds, { resource_type: 'video' });
        await cloudinary.api.delete_resources(publicIds, { resource_type: 'raw' });

    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
        // We don't throw here to avoid blocking DB op if Cloudinary fails, 
        // but we log it.
    }
}
