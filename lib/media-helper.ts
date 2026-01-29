export function extractPublicId(url: string): string | null {
  try {
    // Cloudinary
    if (url.includes('cloudinary.com')) {
        const regex = /\/v\d+\/(.+?)(\.[a-z]+)?$/;
        const match = url.match(regex);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // ImageKit
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (endpoint && url.startsWith(endpoint)) {
        let path = url.replace(endpoint, '');
        if (path.startsWith('/')) path = path.substring(1);
        return path.split('?')[0];
    }

    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/**
 * Generates an optimized URL (Cloudinary or ImageKit).
 * @param url - The original URL
 * @param type - 'image' or 'video'
 * @param width - Optional width to resize to
 * @returns The optimized URL
 */
export function getOptimizedUrl(url: string, type: 'image' | 'video' = 'image', width?: number): string {
    if (!url) return "";

    // --- ImageKit Optimization ---
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (endpoint && url.startsWith(endpoint)) {
        const parts = url.split('?');
        const baseUrl = parts[0];
        const transformations: string[] = [];

        // Quality & Format Auto (ImageKit uses standard params or specific transforms)
        // ImageKit automatically optimizes format if setting enabled in dashboard, but we can force it?
        // 'f-auto' is usually standard.
        // transformations.push('f-auto'); // ImageKit handles this via dashboard usually, but we can add
        
        if (width) {
            transformations.push(`w-${width}`);
        }
        
        if (transformations.length > 0) {
            return `${baseUrl}?tr=${transformations.join(',')}`;
        }
        return url;
    }

    // --- Cloudinary Optimization (Legacy/Fallback) ---
    if (url.includes('cloudinary.com')) {
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
        
        return `${base}/upload/${transformations.join(',')}/${rest}`;
    }

    return url;
}
