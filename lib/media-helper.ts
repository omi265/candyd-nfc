export function extractPublicId(url: string): string | null {
  try {
    const regex = /\/v\d+\/(.+)$/;
    const match = url.match(regex);
    if (match && match[1]) {
        let path = match[1].split('?')[0];
        path = path.replace(/\.[a-zA-Z0-9]+$/, '');
        return path;
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

    // If the URL is already signed, do not try to modify it as it will break the signature
    if (url.includes('/s--')) return url;

    // Check for both 'upload' and 'private' / 'authenticated'
    let accessType = 'upload';
    if (url.includes('/private/')) accessType = 'private';
    else if (url.includes('/authenticated/')) accessType = 'authenticated';

    const splitStr = `/${accessType}/`;
    const parts = url.split(splitStr);
    if (parts.length !== 2) return url;

    const [base, rest] = parts;
    const transformations = ['f_auto', 'q_auto']; // Default format & quality auto

    // Add width limit if provided
    if (width) {
        transformations.push(`w_${width}`);
        transformations.push('c_limit'); // Scale down only, preserve aspect ratio
    }
    
    return `${base}/${accessType}/${transformations.join(',')}/${rest}`;
}
