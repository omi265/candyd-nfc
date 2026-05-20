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
    const privateIndex = parts.indexOf('private');
    const authIndex = parts.indexOf('authenticated');
    
    const index = uploadIndex !== -1 ? uploadIndex : (privateIndex !== -1 ? privateIndex : authIndex);
    if (index === -1) return null;
    
    const afterType = parts.slice(index + 1);
    // Remove signature if present
    if (afterType[0].startsWith('s--')) {
        afterType.shift();
    }
    // Remove version if present
    if (afterType[0].startsWith('v') && !isNaN(afterType[0].substring(1))) {
      afterType.shift();
    }
    
    const publicIdWithExtension = afterType.join('/');
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch (e) {
    return null;
  }
}

async function migrateAll() {
  console.log("Starting full migration to AUTHENTICATED assets...");
  
  try {
    const memoriesMedia = await db.media.findMany();
    const experienceMedia = await db.experienceMedia.findMany();
    const habitLogs = await db.habitLog.findMany({ where: { imageUrl: { not: null } } });

    const allUrls = [
        ...memoriesMedia.map(m => m.url),
        ...experienceMedia.map(m => m.url),
        ...habitLogs.map(m => m.imageUrl)
    ].filter(Boolean);

    const uniqueUrls = [...new Set(allUrls)];
    console.log(`Total unique URLs to process: ${uniqueUrls.length}`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const url of uniqueUrls) {
      if (url.includes('/authenticated/')) {
        skipped++;
        continue;
      }

      const publicId = getPublicIdFromUrl(url);
      if (!publicId) {
        console.warn(`Could not extract public ID from: ${url}`);
        failed++;
        continue;
      }

      // Detect current type
      let currentType = 'upload';
      if (url.includes('/private/')) currentType = 'private';

      try {
        console.log(`Migrating ${publicId} from ${currentType} to authenticated...`);
        
        // Use upload with remote URL to change type safely and invalidate cache
        await cloudinary.uploader.upload(url, {
            public_id: publicId,
            type: 'authenticated',
            invalidate: true,
            overwrite: true
        });

        // Delete old version if it was different
        if (currentType !== 'authenticated') {
            await cloudinary.uploader.destroy(publicId, { type: currentType, invalidate: true });
        }
        
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
