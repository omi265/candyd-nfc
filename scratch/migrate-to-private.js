require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const db = prismaClientSingleton();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getPublicIdFromUrl(url) {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    const afterUpload = parts.slice(uploadIndex + 1);
    if (afterUpload[0].startsWith('v') && !isNaN(afterUpload[0].substring(1))) {
      afterUpload.shift();
    }
    
    const publicIdWithExtension = afterUpload.join('/');
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch (e) {
    return null;
  }
}

async function migrateAll() {
  console.log("Starting full migration to private assets...");
  
  try {
    // 1. Memories
    const memoriesMedia = await db.media.findMany();
    console.log(`Found ${memoriesMedia.length} memory media items.`);

    // 2. Experience Media
    const experienceMedia = await db.experienceMedia.findMany();
    console.log(`Found ${experienceMedia.length} experience media items.`);

    // 3. Habit Logs
    const habitLogs = await db.habitLog.findMany({
        where: {
            imageUrl: { not: null }
        }
    });
    console.log(`Found ${habitLogs.length} habit log images.`);

    const allUrls = [
        ...memoriesMedia.map(m => m.url),
        ...experienceMedia.map(m => m.url),
        ...habitLogs.map(m => m.imageUrl)
    ].filter(Boolean);

    const uniqueUrls = [...new Set(allUrls)];
    console.log(`Total unique URLs: ${uniqueUrls.length}`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const url of uniqueUrls) {
      if (url.includes('/private/')) {
        skipped++;
        continue;
      }

      const publicId = getPublicIdFromUrl(url);
      if (!publicId) {
        failed++;
        continue;
      }

      try {
        await cloudinary.uploader.rename(publicId, publicId, {
          from_type: 'upload',
          to_type: 'private',
          overwrite: true
        });
        success++;
      } catch (err) {
        console.error(`Failed ${publicId}:`, err.message);
        failed++;
      }
    }

    console.log(`\nFinal Results:\nSuccess: ${success}\nFailed: ${failed}\nSkipped: ${skipped}`);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await db.$disconnect();
  }
}

migrateAll();
