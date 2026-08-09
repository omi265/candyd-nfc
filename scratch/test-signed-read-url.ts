import "dotenv/config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.RAILWAY_STORAGE_REGION || "auto",
  endpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
  },
});

async function testSignedReadUrl() {
  console.log("🔒 Generating S3 Presigned Signed GET URL...");
  const bucketName = process.env.RAILWAY_STORAGE_BUCKET_NAME;
  const fileKey = "uploads/test-public-1786318277743.txt";

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  // Expire in 15 seconds for testing
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 });
  console.log("✅ SIGNED GET URL GENERATED!");
  console.log("🌐 Signed URL:", signedUrl);
}

testSignedReadUrl();
