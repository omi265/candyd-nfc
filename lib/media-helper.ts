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
