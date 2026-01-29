"use server";

import cloudinary from "@/lib/cloudinary";
import { extractPublicId, deleteFromCloudinary, isValidCloudinaryUrl } from "@/lib/cloudinary-helper";
import { getImageKitAuth, deleteFromImageKit, isValidImageKitUrl } from "@/lib/imagekit-helper";

export type UploadConfig = 
  | { provider: 'imagekit'; token: string; expire: number; signature: string; publicKey: string; urlEndpoint: string }
  | { provider: 'cloudinary'; signature: string; timestamp: number; folder: string; cloudName: string; apiKey: string };

export async function getUploadConfig(folder: string = "candyd_memories"): Promise<UploadConfig> {
    // Prefer ImageKit if configured
    if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
        try {
            const auth = getImageKitAuth();
            if (auth) {
                return {
                    provider: 'imagekit',
                    token: auth.token,
                    expire: auth.expire,
                    signature: auth.signature,
                    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
                    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
                };
            }
        } catch (e) {
            console.warn("ImageKit configured but failed, falling back to Cloudinary", e);
        }
    }

    // Fallback to Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder },
        process.env.CLOUDINARY_API_SECRET!
    );

    return {
        provider: 'cloudinary',
        timestamp,
        signature,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        folder
    };
}

export async function deleteUploadedFile(url: string) {
  try {
    if (isValidImageKitUrl(url)) {
        await deleteFromImageKit([url]);
    } else if (isValidCloudinaryUrl(url)) {
        const pid = extractPublicId(url);
        if (pid) await deleteFromCloudinary([pid]);
    }
    return { success: true };
  } catch (error) {
    console.error("Delete file error:", error);
    return { success: false };
  }
}
