require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const db = prismaClientSingleton();

async function updateDbUrls(productId) {
  console.log(`Updating DB URLs for charm: ${productId}`);
  
  try {
    // 1. Update Media (Memories)
    const mediaItems = await db.media.findMany({
        where: {
            memory: { productId }
        }
    });
    
    console.log(`Found ${mediaItems.length} media items in DB.`);
    
    for (const item of mediaItems) {
        if (!item.url.includes('/authenticated/')) {
            const newUrl = item.url.replace('/upload/', '/authenticated/').replace('/private/', '/authenticated/');
            await db.media.update({
                where: { id: item.id },
                data: { url: newUrl }
            });
            console.log(`Updated Media ID ${item.id} to authenticated path.`);
        }
    }

    // 2. Update Experience Media
    const expMedia = await db.experienceMedia.findMany({
        where: {
            experience: {
                item: {
                    lifeList: { productId }
                }
            }
        }
    });
    
    console.log(`Found ${expMedia.length} experience media items in DB.`);
    for (const item of expMedia) {
        if (!item.url.includes('/authenticated/')) {
            const newUrl = item.url.replace('/upload/', '/authenticated/').replace('/private/', '/authenticated/');
            await db.experienceMedia.update({
                where: { id: item.id },
                data: { url: newUrl }
            });
            console.log(`Updated ExperienceMedia ID ${item.id} to authenticated path.`);
        }
    }

    console.log('Database URL sync complete for this charm.');

  } catch (error) {
    console.error('Error updating DB URLs:', error);
  } finally {
    await db.$disconnect();
  }
}

updateDbUrls('cmkywmmux0000vmm13r702g4i');
