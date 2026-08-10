import "dotenv/config";
import { getRailwayPresignedUploadUrl } from "../lib/storage";
import { getSignedUrlFromCloudinaryUrl } from "../lib/cloudinary-helper";
import { db } from "../lib/db";

async function runFullPipelineTest() {
  console.log("=================================================");
  console.log("🧪 STARTING FULL COMPREHENSIVE UPLOAD PIPELINE TEST");
  console.log("=================================================\n");

  const testFilename = `test-pipeline-${Date.now()}.png`;
  const mimeType = "image/png";
  const sampleImageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // STEP 1: Test S3 Presigned Upload URL Generation
  console.log("1️⃣ Testing S3 Presigned Upload URL Generation...");
  const uploadInfo = await getRailwayPresignedUploadUrl(testFilename, mimeType);
  console.log("   ✅ Presigned PUT Upload URL:", uploadInfo.uploadUrl);
  console.log("   ✅ S3 Media Storage Key:", uploadInfo.fileKey);
  console.log("   ✅ Internal Media URL:", uploadInfo.publicUrl);
  console.log("   -------------------------------------------------");

  // STEP 2: Test Direct S3 Presigned PUT Upload
  console.log("2️⃣ Testing Direct S3 Presigned HTTP PUT Upload...");
  const putRes = await fetch(uploadInfo.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: sampleImageBuffer,
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`S3 Presigned PUT failed with status ${putRes.status}: ${errorText}`);
  }
  console.log("   ✅ HTTP PUT Status:", putRes.status, putRes.statusText);
  console.log("   -------------------------------------------------");

  // STEP 3: Test Presigned Signed Read URL Generation
  console.log("3️⃣ Testing Presigned Signed Read URL Generation...");
  const fullS3Url = `${process.env.RAILWAY_STORAGE_PUBLIC_URL || "https://t3.storageapi.dev"}/${uploadInfo.fileKey}`;
  const signedReadUrl = await getSignedUrlFromCloudinaryUrl(fullS3Url, "image");
  console.log("   ✅ Full S3 Object URL:", fullS3Url);
  console.log("   ✅ Generated Signed GET Read URL:");
  console.log("   ", signedReadUrl);
  console.log("   -------------------------------------------------");

  // STEP 4: Test HTTP GET Fetching of Uploaded Asset via Presigned Read URL
  console.log("4️⃣ Verifying HTTP GET Read Access to Uploaded Asset...");
  const getRes = await fetch(signedReadUrl!);
  console.log("   ✅ HTTP GET Status:", getRes.status, getRes.statusText);
  console.log("   ✅ Content-Type:", getRes.headers.get("content-type"));
  console.log("   ✅ Content-Length:", getRes.headers.get("content-length"));

  if (!getRes.ok) {
    throw new Error(`Failed to fetch uploaded asset: HTTP ${getRes.status}`);
  }
  console.log("   -------------------------------------------------");

  // STEP 5: Test Database Memory & Media Record Creation
  console.log("5️⃣ Testing Prisma Database Memory & Media Record Creation...");
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: `testuser-${Date.now()}@ourdve.com`,
        name: "Test User",
      },
    });
  }

  const memory = await db.memory.create({
    data: {
      userId: user.id,
      title: "Automated E2E Test Memory",
      description: "Testing end-to-end media upload pipeline",
      date: new Date(),
      media: {
        create: [
          {
            url: fullS3Url,
            type: "image",
            size: sampleImageBuffer.length,
            orderIndex: 0,
          },
        ],
      },
    },
    include: { media: true },
  });

  console.log("   ✅ Memory Created in DB with ID:", memory.id);
  console.log("   ✅ Attached Media Record ID:", memory.media[0].id);
  console.log("   ✅ Saved Media URL in DB:", memory.media[0].url);
  console.log("   -------------------------------------------------");

  // STEP 6: Verify Database Query & Presigned URL Resolution
  console.log("6️⃣ Testing Full Query & Presigned Signed GET Resolution...");
  const fetchedMemory = await db.memory.findUnique({
    where: { id: memory.id },
    include: { media: true },
  });

  const resolvedMediaUrls = await Promise.all(
    fetchedMemory!.media.map(async (m) => ({
      id: m.id,
      originalUrl: m.url,
      signedReadUrl: await getSignedUrlFromCloudinaryUrl(m.url, m.type),
    }))
  );

  console.log("   ✅ Resolved Media Output:", resolvedMediaUrls);
  console.log("   -------------------------------------------------");

  // Cleanup test DB record
  await db.memory.delete({ where: { id: memory.id } });
  console.log("🧹 Cleaned up temporary test memory from database.");

  console.log("\n=================================================");
  console.log("🎉 ALL 6 STAGES OF THE UPLOAD PIPELINE PASSED PERFECTLY!");
  console.log("=================================================");
}

runFullPipelineTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ UPLOAD PIPELINE TEST FAILED:", err);
    process.exit(1);
  });
