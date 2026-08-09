import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.RAILWAY_STORAGE_REGION || "auto",
  endpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
  },
});

async function setCors() {
  console.log("⚙️ Setting CORS configuration on Railway S3 Object Storage...");
  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.RAILWAY_STORAGE_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
            AllowedOrigins: ["*"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    await s3Client.send(command);
    console.log("✅ CORS CONFIGURATION APPLIED SUCCESSFULLY TO BUCKET!");
  } catch (error) {
    console.error("⚠️ Failed to set bucket CORS via S3 API:", error);
  }
}

setCors();
