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
  // Typical Cloudinary URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/public_id.jpg
  // We need "folder/public_id"
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Everything after vXXXXXXXX/ or the next part after 'upload'
    const afterUpload = parts.slice(uploadIndex + 1);
    if (afterUpload[0].startsWith('v') && !isNaN(afterUpload[0].substring(1))) {
      afterUpload.shift(); // remove version
    }
    
    const publicIdWithExtension = afterUpload.join('/');
    return publicIdWithExtension.replace(/\.[^/.]+$/, ""); // remove extension
  } catch (e) {
    return null;
  }
}

async function migrateCharm(productId) {
  console.log(`Starting migration for charm ID: ${productId}`);
  
  try {
    // 1. Get Memories Media
    const memories = await db.memory.findMany({
      where: { productId },
      include: { media: true }
    });
    
    let mediaUrls = memories.flatMap(m => m.media.map(med => med.url));
    console.log(`Found ${mediaUrls.length} media items from memories.`);

    // 2. Get Life List Experience Media
    const lifeLists = await db.lifeList.findMany({
      where: { productId },
      include: { 
        items: { 
          include: { 
            experience: { 
              include: { media: true } 
            } 
          } 
        } 
      }
    });
    
    const experienceMediaUrls = lifeLists.flatMap(ll => 
      ll.items.flatMap(item => 
        item.experience?.media.map(med => med.url) || []
      )
    );
    console.log(`Found ${experienceMediaUrls.length} media items from experiences.`);
    mediaUrls = mediaUrls.concat(experienceMediaUrls);

    // 3. Get Habit Log Images
    const habits = await db.habit.findMany({
      where: { productId },
      include: { logs: true }
    });
    
    const habitImageUrls = habits.flatMap(h => 
      h.logs.map(log => log.imageUrl).filter(Boolean)
    );
    console.log(`Found ${habitImageUrls.length} images from habit logs.`);
    mediaUrls = mediaUrls.concat(habitImageUrls);

    // Filter unique URLs
    const uniqueUrls = [...new Set(mediaUrls)];
    console.log(`Total unique URLs to process: ${uniqueUrls.length}`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const url of uniqueUrls) {
      if (url.includes('/private/')) {
        console.log(`Skipping already private asset: ${url}`);
        skippedCount++;
        continue;
      }

      const publicId = getPublicIdFromUrl(url);
      if (!publicId) {
        console.warn(`Could not extract public ID from URL: ${url}`);
        failCount++;
        continue;
      }

      try {
        console.log(`Migrating asset: ${publicId}`);
        // Rename with to_type: 'private' effectively moves it from 'upload' to 'private'
        await cloudinary.uploader.rename(publicId, publicId, {
          from_type: 'upload',
          to_type: 'private',
          overwrite: true
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to migrate ${publicId}:`, error.message);
        failCount++;
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('Done.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.$disconnect();
  }
}

const targetId = process.env.TARGET_PRODUCT_ID;
if (!targetId) {
  console.error('Please provide TARGET_PRODUCT_ID environment variable.');
  process.exit(1);
}

migrateCharm(targetId);
