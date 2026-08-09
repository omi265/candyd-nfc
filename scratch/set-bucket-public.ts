import "dotenv/config";
import { S3Client, PutBucketPolicyCommand, PutObjectAclCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.RAILWAY_STORAGE_REGION || "auto",
  endpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY!,
  },
});

async function setBucketPublic() {
  console.log("⚙️ Setting Public Read Policy on Railway Tigris S3 Bucket...");
  const bucketName = process.env.RAILWAY_STORAGE_BUCKET_NAME;

  // Policy to allow public GET access to objects in bucket
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  };

  try {
    const command = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy),
    });
    await s3Client.send(command);
    console.log("✅ BUCKET PUBLIC READ POLICY APPLIED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("⚠️ PutBucketPolicy error:", error.message || error);
  }
}

setBucketPublic();
