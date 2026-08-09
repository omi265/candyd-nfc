import "dotenv/config";
import { getRailwayPresignedUploadUrl } from "../lib/storage";

async function testStorage() {
  console.log("🔍 Testing Railway Object Storage S3 presigned URL generation...");
  
  try {
    const result = await getRailwayPresignedUploadUrl("test-image.jpg", "image/jpeg");
    console.log("==========================================");
    console.log("✅ S3 STORAGE CONNECTION SUCCESSFUL!");
    console.log("==========================================");
    console.log(`🔑 File Key:   ${result.fileKey}`);
    console.log(`🌐 Public URL: ${result.publicUrl}`);
    console.log("==========================================");
  } catch (error) {
    console.error("❌ STORAGE CONNECTION FAILED:", error);
  }
}

testStorage();
