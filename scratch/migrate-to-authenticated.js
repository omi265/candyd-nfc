require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

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
    
    let publicIdWithExtension = afterType.join('/');
    publicIdWithExtension = publicIdWithExtension.split('?')[0];
    publicIdWithExtension = publicIdWithExtension.replace(/\.[a-zA-Z0-9]+$/, "");
    return publicIdWithExtension;
  } catch (e) {
    return null;
  }
}

async function migrateMediaItem(item, dbTable, urlField = 'url') {
  const urlValue = item[urlField];
  if (!urlValue) return { status: 'skipped' };
  
  if (urlValue.includes('/authenticated/')) {
    return { status: 'skipped' };
  }
  const publicId = getPublicIdFromUrl(urlValue);
  if (!publicId) {
    const errorMsg = `Could not extract public ID from: ${urlValue}`;
    console.warn(`  [Skip/Warn] ${errorMsg}`);
    return { status: 'failed', error: errorMsg };
  }
  const currentType = urlValue.includes('/private/') ? 'private' : 'upload';
  const resourceType = (item.type === 'video' || item.type === 'audio' || urlValue.includes('/video/')) ? 'video' : 'image';

  try {
    console.log(`  -> Renaming ${dbTable} ${publicId} (${resourceType}) from ${currentType} to authenticated...`);
    await cloudinary.uploader.rename(publicId, publicId, {
      type: currentType,
      to_type: 'authenticated',
      resource_type: resourceType,
      invalidate: true,
      overwrite: true
    });

    const newUrl = urlValue.replace(`/${currentType}/`, '/authenticated/');
    await db[dbTable].update({
      where: { id: item.id },
      data: { [urlField]: newUrl }
    });
    return { status: 'success' };
  } catch (err) {
    const errorStr = err.message || String(err);
    if (errorStr.includes("Resource not found")) {
      try {
        await cloudinary.api.resource(publicId, { type: 'authenticated', resource_type: resourceType });
        console.log(`  -> Asset ${publicId} is already authenticated in Cloudinary. Updating DB URL...`);
        const newUrl = urlValue.replace(`/${currentType}/`, '/authenticated/');
        await db[dbTable].update({
          where: { id: item.id },
          data: { [urlField]: newUrl }
        });
        return { status: 'success' };
      } catch (e) {
        // Failed checking resource
      }
    }
    console.error(`  -> Failed renaming asset ${publicId}:`, errorStr);
    return { status: 'failed', error: errorStr };
  }
}

async function migrateAll() {
  console.log("Starting Charm-Specific Database & Cloudinary Migration to AUTHENTICATED...");
  
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedItems = [];

  try {
    // 1. Fetch all products (Charms)
    const products = await db.product.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${products.length} products/charms in the database.\n`);

    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      console.log(`\n========================================`);
      console.log(`[Charm ${index + 1}/${products.length}] "${product.name}"`);
      console.log(`ID: ${product.id} | Type: ${product.type}`);
      console.log(`========================================`);

      let pSuccess = 0;
      let pFailed = 0;
      let pSkipped = 0;

      const recordFailure = (item, dbTable, urlField, errorMsg) => {
        failedItems.push({
          charmId: product.id,
          charmName: product.name,
          charmType: product.type,
          dbTable,
          itemId: item.id,
          url: item[urlField],
          error: errorMsg
        });
      };

      if (product.type === 'MEMORY') {
        // Find memories
        const memories = await db.memory.findMany({
          where: { productId: product.id }
        });
        console.log(`Found ${memories.length} memories for this charm.`);
        
        const memoryIds = memories.map(m => m.id);
        if (memoryIds.length > 0) {
          const mediaItems = await db.media.findMany({
            where: { memoryId: { in: memoryIds } }
          });
          console.log(`Found ${mediaItems.length} media items associated with memories.`);
          
          for (const media of mediaItems) {
            const res = await migrateMediaItem(media, 'media');
            if (res.status === 'success') pSuccess++;
            else if (res.status === 'skipped') pSkipped++;
            else {
              pFailed++;
              recordFailure(media, 'media', 'url', res.error);
            }
          }
        }
      } 
      else if (product.type === 'LIFELIST') {
        // Find life lists
        const lifeLists = await db.lifeList.findMany({
          where: { productId: product.id }
        });
        console.log(`Found ${lifeLists.length} life lists for this charm.`);

        const listIds = lifeLists.map(l => l.id);
        if (listIds.length > 0) {
          const listItems = await db.lifeListItem.findMany({
            where: { lifeListId: { in: listIds } }
          });
          
          const itemIds = listItems.map(i => i.id);
          if (itemIds.length > 0) {
            const experiences = await db.experience.findMany({
              where: { itemId: { in: itemIds } }
            });

            const expIds = experiences.map(e => e.id);
            if (expIds.length > 0) {
              const expMedia = await db.experienceMedia.findMany({
                where: { experienceId: { in: expIds } }
              });
              console.log(`Found ${expMedia.length} experience media items.`);

              for (const media of expMedia) {
                const res = await migrateMediaItem(media, 'experienceMedia');
                if (res.status === 'success') pSuccess++;
                else if (res.status === 'skipped') pSkipped++;
                else {
                  pFailed++;
                  recordFailure(media, 'experienceMedia', 'url', res.error);
                }
              }
            }
          }
        }
      } 
      else if (product.type === 'HABIT') {
        // Find habits
        const habits = await db.habit.findMany({
          where: { productId: product.id }
        });
        console.log(`Found ${habits.length} habits for this charm.`);

        const habitIds = habits.map(h => h.id);
        if (habitIds.length > 0) {
          const logs = await db.habitLog.findMany({
            where: { habitId: { in: habitIds }, imageUrl: { not: null } }
          });
          console.log(`Found ${logs.length} habit logs with images.`);

          for (const log of logs) {
            const res = await migrateMediaItem(log, 'habitLog', 'imageUrl');
            if (res.status === 'success') pSuccess++;
            else if (res.status === 'skipped') pSkipped++;
            else {
              pFailed++;
              recordFailure(log, 'habitLog', 'imageUrl', res.error);
            }
          }
        }
      }

      console.log(`Charm Summary: Success: ${pSuccess} | Failed: ${pFailed} | Skipped: ${pSkipped}`);
      totalSuccess += pSuccess;
      totalFailed += pFailed;
      totalSkipped += pSkipped;
    }

    // 2. Orphan/Residual Media Check
    console.log(`\n========================================`);
    console.log(`[Phase 2] Orphan/Legacy Media Cleanup`);
    console.log(`========================================`);

    const recordOrphanFailure = (item, dbTable, urlField, errorMsg) => {
      failedItems.push({
        charmId: 'ORPHAN',
        charmName: 'ORPHAN',
        charmType: 'ORPHAN',
        dbTable,
        itemId: item.id,
        url: item[urlField],
        error: errorMsg
      });
    };
    
    // Memory media leftovers
    const leftoverMedia = await db.media.findMany({
      where: {
        OR: [
          { url: { contains: '/upload/' } },
          { url: { contains: '/private/' } }
        ]
      }
    });
    if (leftoverMedia.length > 0) {
      console.log(`Found ${leftoverMedia.length} orphaned memory media items to clean up.`);
      for (const item of leftoverMedia) {
        const res = await migrateMediaItem(item, 'media');
        if (res.status === 'success') totalSuccess++;
        else if (res.status === 'skipped') totalSkipped++;
        else {
          totalFailed++;
          recordOrphanFailure(item, 'media', 'url', res.error);
        }
      }
    }

    // Experience media leftovers
    const leftoverExpMedia = await db.experienceMedia.findMany({
      where: {
        OR: [
          { url: { contains: '/upload/' } },
          { url: { contains: '/private/' } }
        ]
      }
    });
    if (leftoverExpMedia.length > 0) {
      console.log(`Found ${leftoverExpMedia.length} orphaned experience media items to clean up.`);
      for (const item of leftoverExpMedia) {
        const res = await migrateMediaItem(item, 'experienceMedia');
        if (res.status === 'success') totalSuccess++;
        else if (res.status === 'skipped') totalSkipped++;
        else {
          totalFailed++;
          recordOrphanFailure(item, 'experienceMedia', 'url', res.error);
        }
      }
    }

    // Habit log leftovers
    const leftoverHabitLogs = await db.habitLog.findMany({
      where: {
        imageUrl: { not: null },
        OR: [
          { imageUrl: { contains: '/upload/' } },
          { imageUrl: { contains: '/private/' } }
        ]
      }
    });
    if (leftoverHabitLogs.length > 0) {
      console.log(`Found ${leftoverHabitLogs.length} orphaned habit log images to clean up.`);
      for (const item of leftoverHabitLogs) {
        const res = await migrateMediaItem(item, 'habitLog', 'imageUrl');
        if (res.status === 'success') totalSuccess++;
        else if (res.status === 'skipped') totalSkipped++;
        else {
          totalFailed++;
          recordOrphanFailure(item, 'habitLog', 'imageUrl', res.error);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`Global Migration Summary:`);
    console.log(`Successfully migrated: ${totalSuccess}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Skipped (already authenticated): ${totalSkipped}`);
    console.log(`========================================`);

    // Write failed items list to file
    const failuresFilePath = path.join(__dirname, 'migration-failures.json');
    if (failedItems.length > 0) {
      fs.writeFileSync(failuresFilePath, JSON.stringify(failedItems, null, 2));
      console.log(`\n[WARNING] Saved ${failedItems.length} failed items to: ${failuresFilePath}`);
    } else {
      if (fs.existsSync(failuresFilePath)) {
        fs.unlinkSync(failuresFilePath);
      }
      console.log(`\n[Success] No failures. No failure log created/retained.`);
    }

  } catch (error) {
    console.error("Migration fatal error:", error);
  } finally {
    await db.$disconnect();
  }
}

migrateAll();
