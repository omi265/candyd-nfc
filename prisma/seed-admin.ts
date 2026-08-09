import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment");
  }

  const url = new URL(connectionString);
  const pool = new Pool({
    user: url.username,
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    database: url.pathname.slice(1),
    ssl: false,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@ourdve.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminName = process.env.ADMIN_NAME || "Admin User";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      password: hashedPassword,
      name: adminName,
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("==========================================");
  console.log("🎉 ADMIN ACCOUNT CREATED / UPDATED SUCCESSFULLY!");
  console.log("==========================================");
  console.log(`📧 Email:    ${user.email}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`👑 Role:     ${user.role}`);
  console.log("==========================================");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Error seeding admin user:", e);
  process.exit(1);
});
