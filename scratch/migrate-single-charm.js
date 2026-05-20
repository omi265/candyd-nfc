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
    if (afterType[0].startsWith('s--')) {
        afterType.shift();
    }
    if (afterType[0].startsWith('v') && !isNaN(afterType[0].substring(1))) {
      afterType.shift();
    }
    
    const publicIdWithExtension = afterType.join('/');
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch (e) {
    return null;
  }
}

async function migrateSingleCharm(productId) {
  console.log(`Starting rename-based migration to AUTHENTICATED for charm: ${productId}`);
  
  try {
    // 1. Get Memories Media
    const memoriesMedia = await db.media.findMany({
      where: { memory: { productId } }
    });

    // 2. Get Experience Media
    const experienceMedia = await db.experienceMedia.findMany({
      where: {
        experience: {
          item: {
            lifeList: { productId }
          }
        }
      }
    });

    // 3. Get Habit Logs
    const habits = await db.habit.findMany({
      where: { productId }
    });
    const habitIds = habits.map(h => h.id);
    const habitLogs = await db.habitLog.findMany({
      where: {
        habitId: { in: habitIds },
        imageUrl: { not: null }
      }
    });

    console.log(`Found in DB:`);
    console.log(`- ${memoriesMedia.length} Memory media items`);
    console.log(`- ${experienceMedia.length} Experience media items`);
    console.log(`- ${habitLogs.length} Habit log media items`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    // Migrate Media (Memories)
    for (const item of memoriesMedia) {
      if (item.url.includes('/authenticated/')) {
        skipped++;
        continue;
      }
      const publicId = getPublicIdFromUrl(item.url);
      if (!publicId) {
        console.warn(`Could not extract public ID from Media: ${item.url}`);
        failed++;
        continue;
      }
      const currentType = item.url.includes('/private/') ? 'private' : 'upload';
      const resourceType = (item.type === 'video' || item.type === 'audio' || item.url.includes('/video/')) ? 'video' : 'image';

      try {
        console.log(`[Media] Renaming ${publicId} (${resourceType}) from ${currentType} to authenticated...`);
        
        await cloudinary.uploader.rename(publicId, publicId, {
          type: currentType,
          to_type: 'authenticated',
          resource_type: resourceType,
          invalidate: true,
          overwrite: true
        });

        // Update DB
        const newUrl = item.url.replace(`/${currentType}/`, '/authenticated/');
        await db.media.update({
          where: { id: item.id },
          data: { url: newUrl }
        });
        console.log(`[Media] Updated DB to: ${newUrl}`);
        success++;
      } catch (err) {
        console.error(`[Media] Failed renaming ${publicId}:`, err.message);
        failed++;
      }
    }

    // Migrate ExperienceMedia (Life Charm)
    for (const item of experienceMedia) {
      if (item.url.includes('/authenticated/')) {
        skipped++;
        continue;
      }
      const publicId = getPublicIdFromUrl(item.url);
      if (!publicId) {
        console.warn(`Could not extract public ID from ExperienceMedia: ${item.url}`);
        failed++;
        continue;
      }
      const currentType = item.url.includes('/private/') ? 'private' : 'upload';
      const resourceType = (item.type === 'video' || item.type === 'audio' || item.url.includes('/video/')) ? 'video' : 'image';

      try {
        console.log(`[ExperienceMedia] Renaming ${publicId} (${resourceType}) from ${currentType} to authenticated...`);
        
        await cloudinary.uploader.rename(publicId, publicId, {
          type: currentType,
          to_type: 'authenticated',
          resource_type: resourceType,
          invalidate: true,
          overwrite: true
        });

        // Update DB
        const newUrl = item.url.replace(`/${currentType}/`, '/authenticated/');
        await db.experienceMedia.update({
          where: { id: item.id },
          data: { url: newUrl }
        });
        console.log(`[ExperienceMedia] Updated DB to: ${newUrl}`);
        success++;
      } catch (err) {
        console.error(`[ExperienceMedia] Failed renaming ${publicId}:`, err.message);
        failed++;
      }
    }

    // Migrate Habit Logs
    for (const item of habitLogs) {
      if (!item.imageUrl) continue;
      if (item.imageUrl.includes('/authenticated/')) {
        skipped++;
        continue;
      }
      const publicId = getPublicIdFromUrl(item.imageUrl);
      if (!publicId) {
        console.warn(`Could not extract public ID from HabitLog: ${item.imageUrl}`);
        failed++;
        continue;
      }
      const currentType = item.imageUrl.includes('/private/') ? 'private' : 'upload';
      const resourceType = item.imageUrl.includes('/video/') ? 'video' : 'image';

      try {
        console.log(`[HabitLog] Renaming ${publicId} (${resourceType}) from ${currentType} to authenticated...`);
        
        await cloudinary.uploader.rename(publicId, publicId, {
          type: currentType,
          to_type: 'authenticated',
          resource_type: resourceType,
          invalidate: true,
          overwrite: true
        });

        // Update DB
        const newUrl = item.imageUrl.replace(`/${currentType}/`, '/authenticated/');
        await db.habitLog.update({
          where: { id: item.id },
          data: { imageUrl: newUrl }
        });
        console.log(`[HabitLog] Updated DB to: ${newUrl}`);
        success++;
      } catch (err) {
        console.error(`[HabitLog] Failed renaming ${publicId}:`, err.message);
        failed++;
      }
    }

    console.log(`\nRename Migration completed for charm ${productId}:\nSuccess: ${success}\nFailed: ${failed}\nSkipped: ${skipped}`);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await db.$disconnect();
  }
}

const targetCharm = 'cmk81dzcz0000wfm1jqccx1uu';
migrateSingleCharm(targetCharm);
