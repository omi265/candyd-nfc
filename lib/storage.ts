import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { Readable } from "stream";

const hasRailwayStorage = Boolean(
  process.env.RAILWAY_STORAGE_ENDPOINT &&
  process.env.RAILWAY_STORAGE_ACCESS_KEY_ID &&
  process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY
);

const s3Client = hasRailwayStorage
  ? new S3Client({
      region: process.env.RAILWAY_STORAGE_REGION || "auto",
      endpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/**
 * Generates an S3 presigned PUT URL for direct browser upload to Railway Object Storage
 */
export async function getRailwayPresignedUploadUrl(filename: string, contentType: string, size: number, scope: string) {
  if (!s3Client) {
    throw new Error("Railway Storage credentials not configured in environment");
  }

  const extension = filename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() || "";
  const fileKey = `uploads/${scope}/${randomUUID()}${extension}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.RAILWAY_STORAGE_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    ContentLength: size,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `/api/media/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

/**
 * Direct server-side upload to Railway Object Storage
 */
export async function uploadDirectToRailwayStorage(
  filename: string,
  contentType: string,
  body: Buffer | Readable,
  scope: string,
  contentLength?: number
) {
  if (!s3Client) {
    throw new Error("Railway Storage credentials not configured in environment");
  }

  const extension = filename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() || "";
  const fileKey = `uploads/${scope}/${randomUUID()}${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.RAILWAY_STORAGE_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    Body: body,
    ContentLength: contentLength,
  });

  await s3Client.send(command);
  return `/api/media/${fileKey}`;
}

/**
 * Fetches object stream from Railway Object Storage for Next.js media proxy
 */
export async function getS3ObjectStream(fileKey: string, range?: string) {
  if (!s3Client) {
    throw new Error("Railway Storage credentials not configured in environment");
  }

  const command = new GetObjectCommand({
    Bucket: process.env.RAILWAY_STORAGE_BUCKET_NAME,
    Key: fileKey,
    Range: range,
  });

  const response = await s3Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    acceptRanges: response.AcceptRanges,
  };
}

/**
 * Deletes an object from Railway Object Storage
 */
export async function deleteFromRailwayStorage(fileKey: string) {
  if (!s3Client) return;

  const command = new DeleteObjectCommand({
    Bucket: process.env.RAILWAY_STORAGE_BUCKET_NAME,
    Key: fileKey,
  });
  await s3Client.send(command);
}
