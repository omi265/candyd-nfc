import cloudinary from "@/lib/cloudinary";

export { extractPublicId } from "./media-helper";

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
