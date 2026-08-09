import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.RAILWAY_STORAGE_REGION || "auto",
  endpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
  },
});

async function testPublicAcl() {
  console.log("🧪 Testing PutObject with ACL: 'public-read'...");
  const bucketName = process.env.RAILWAY_STORAGE_BUCKET_NAME;
  const key = `uploads/test-public-${Date.now()}.txt`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "Hello Tigris Public Access Test",
      ContentType: "text/plain",
      ACL: "public-read",
    });
    await s3Client.send(command);
    const publicUrl = `https://${bucketName}.t3.storageapi.dev/${key}`;
    console.log("✅ Uploaded test file with public-read ACL!");
    console.log("🌐 URL:", publicUrl);
  } catch (error: any) {
    console.error("⚠️ PutObject error:", error.message || error);
  }
}

testPublicAcl();
