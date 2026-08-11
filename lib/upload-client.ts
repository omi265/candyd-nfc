import {
  getStorageUploadPresignedUrl,
  getGuestStorageUploadPresignedUrl,
  getCloudinarySignature,
} from "@/app/actions/upload";
import { getGuestCloudinarySignature } from "@/app/actions/nfc";
import { validateMediaFile } from "@/lib/media-validation";

/**
 * Fast client-side image compressor using HTML5 Canvas.
 * Reduces raw 15MB camera JPEGs to ~300KB WebP/JPEG in <50ms.
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("gif") || file.type.includes("svg")) {
    return file;
  }

  // Skip if file is already small (< 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function uploadMedia(rawFile: File, options?: { guestToken?: string }) {
  const rawValidation = validateMediaFile(rawFile);
  if (!rawValidation.valid) throw new Error(rawValidation.error);

  // Compress image client-side before upload for 20x faster upload speeds
  const file = await compressImageIfNeeded(rawFile);
  const validation = validateMediaFile(file);
  if (!validation.valid) throw new Error(validation.error);

  // 1. Attempt S3 Railway Object Storage upload first
  try {
    const { uploadUrl, publicUrl } = options?.guestToken
      ? await getGuestStorageUploadPresignedUrl(options.guestToken, file.name, file.type, file.size)
      : await getStorageUploadPresignedUrl(file.name, file.type, file.size);
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (res.ok) {
      const resourceType = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
        ? "audio"
        : "image";
      return { secure_url: publicUrl, resource_type: resourceType, bytes: file.size };
    }
  } catch (s3Err) {
    console.warn("Direct S3 PUT blocked by browser CORS, using server upload route...", s3Err);
  }

  // 2. Server-side S3 upload route (bypasses browser CORS completely)
  try {
    const res = await fetch("/api/upload/s3", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-Candyd-File-Name": encodeURIComponent(file.name),
        "X-Candyd-File-Size": String(file.size),
        ...(options?.guestToken ? { "X-Candyd-Guest-Token": options.guestToken } : {}),
      },
      body: file,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (serverErr) {
    console.warn("Server S3 upload route error, attempting Cloudinary fallback...", serverErr);
  }

  // 3. Fallback to Cloudinary upload
  const signatureData = options?.guestToken
    ? await getGuestCloudinarySignature(options.guestToken)
    : await getCloudinarySignature();
  if (!signatureData) throw new Error("Upload authorization failed");
  const { signature, timestamp, folder, cloudName, apiKey } = signatureData;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey!);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("type", "authenticated");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Upload failed");
  }

  return await response.json();
}
