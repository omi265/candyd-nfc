import imagekit from "@/lib/imagekit";

/**
 * Validates that a URL is a valid ImageKit URL
 */
export function isValidImageKitUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) return false;

  try {
    return url.startsWith(endpoint);
  } catch {
    return false;
  }
}

export function filterValidImageKitUrls(urls: string[]): string[] {
  return urls.filter(isValidImageKitUrl);
}

/**
 * Extracts the file name/path from the ImageKit URL to be used for search
 * e.g. https://ik.imagekit.io/id/folder/image.jpg -> folder/image.jpg
 */
export function extractFilePath(url: string): string | null {
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (!endpoint || !url.startsWith(endpoint)) return null;
    
    // Remove endpoint and leading slash
    let path = url.replace(endpoint, '');
    if (path.startsWith('/')) path = path.substring(1);
    
    // Remove query params if any
    path = path.split('?')[0];
    
    return path;
}

export async function deleteFromImageKit(urls: string[]) {
    if (urls.length === 0 || !imagekit) return;
    
    try {
        console.log("Deleting from ImageKit (URLs):", urls);

        // 1. Resolve File IDs from URLs (Inefficient but necessary without DB change)
        const fileIds: string[] = [];
        
        // We have to do this serially or with limited concurrency to avoid rate limits
        // Searching by name (filePath)
        for (const url of urls) {
            const filePath = extractFilePath(url);
            if (!filePath) continue;
            
            try {
                // Determine just the filename from path
                const name = filePath.split('/').pop();
                if (!name) continue;

                const files = await imagekit.listFiles({
                    name: name,
                    limit: 1 
                });
                
                if (files.length > 0) {
                     const match = files.find((f: any) => f.filePath === `/${filePath}` || f.filePath === filePath);
                     if (match) {
                         fileIds.push(match.fileId);
                     }
                }
            } catch (e) {
                console.error("Failed to find file for deletion:", url, e);
            }
        }

        if (fileIds.length > 0) {
            await imagekit.bulkDeleteFiles(fileIds);
            console.log("Deleted file IDs:", fileIds);
        }

    } catch (error) {
        console.error("ImageKit Delete Error:", error);
    }
}

export async function getImageKitUsage(): Promise<number> {
  return 0;
}

/**
 * Generates authentication parameters for client-side upload
 */
export function getImageKitAuth() {
    if (!imagekit) return null;
    return imagekit.getAuthenticationParameters();
}
