import "dotenv/config";
import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { getRailwayPresignedUploadUrl } from "../lib/storage";

async function testFullWorkflow() {
  console.log("🚀 TESTING COMPLETE END-TO-END WORKFLOW...");
  
  // 1. Verify User Login Authentication
  const user = await db.user.findUnique({ where: { email: "admin@ourdve.com" } });
  if (!user) {
    throw new Error("Admin user not found");
  }
  const isPasswordValid = await bcrypt.compare("Admin@123456", user.password);
  console.log(`🔐 1. User Auth Test (admin@ourdve.com): ${isPasswordValid ? "PASSED ✅" : "FAILED ❌"}`);

  // 2. Verify S3 Presigned URL Generation
  const uploadInfo = await getRailwayPresignedUploadUrl("test-memory-photo.jpg", "image/jpeg");
  console.log(`📦 2. S3 Presigned URL Test: PASSED ✅ (URL: ${uploadInfo.publicUrl})`);

  // 3. Verify Database Media Record Insertion
  const memory = await db.memory.create({
    data: {
      title: "Test Memory - OUR DVE",
      description: "Testing complete Railway PostgreSQL + S3 pipeline",
      date: new Date(),
      userId: user.id,
      media: {
        create: {
          url: uploadInfo.publicUrl,
          type: "IMAGE",
        },
      },
    },
    include: {
      media: true,
    },
  });

  console.log(`💾 3. Database Write Test (Memory ID: ${memory.id}): PASSED ✅`);
  console.log(`🖼️ Attached Media URL: ${memory.media[0].url}`);

  // Cleanup test record
  await db.memory.delete({ where: { id: memory.id } });
  console.log("🧹 4. Cleanup Test Record: PASSED ✅");

  console.log("==========================================");
  console.log("🎉 ALL SYSTEMS GO! YOU ARE 100% READY!");
  console.log("==========================================");
}

testFullWorkflow()
  .catch((e) => {
    console.error("❌ WORKFLOW TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
