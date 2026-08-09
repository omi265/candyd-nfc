import { getStorageUploadPresignedUrl, getCloudinarySignature } from "@/app/actions/upload";

export async function uploadMedia(file: File) {
  // 1. Attempt S3 Railway Object Storage upload first
  try {
    const { uploadUrl, publicUrl } = await getStorageUploadPresignedUrl(file.name, file.type);
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
    console.warn("S3 Railway storage upload unavailable, falling back to Cloudinary...", s3Err);
  }

  // 2. Fallback to Cloudinary upload
  const signatureData = await getCloudinarySignature();
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
