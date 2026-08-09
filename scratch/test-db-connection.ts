import "dotenv/config";
import { db } from "../lib/db";

async function testConnection() {
  console.log("🔍 Testing database connection...");
  console.log(`📡 Connecting to: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}`);
  
  try {
    const userCount = await db.user.count();
    const adminUser = await db.user.findFirst({ where: { role: "ADMIN" } });
    
    console.log("==========================================");
    console.log("✅ DATABASE CONNECTION SUCCESSFUL!");
    console.log("==========================================");
    console.log(`📊 Total Users in DB: ${userCount}`);
    console.log(`👑 Admin Account:    ${adminUser ? adminUser.email : "None found"}`);
    console.log("==========================================");
  } catch (error) {
    console.error("❌ DATABASE CONNECTION FAILED:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testConnection();
