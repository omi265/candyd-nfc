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
    // We handle all potential types here
    const uploadIndex = parts.indexOf('upload');
    const privateIndex = parts.indexOf('private');
    const authIndex = parts.indexOf('authenticated');
    
    const index = uploadIndex !== -1 ? uploadIndex : (privateIndex !== -1 ? privateIndex : authIndex);
    if (index === -1) return null;
    
    const afterType = parts.slice(index + 1);
    if (afterType[0].startsWith('s--')) afterType.shift();
    if (afterType[0].startsWith('v') && !isNaN(afterType[0].substring(1))) afterType.shift();
    
    return afterType.join('/').replace(/\.[^/.]+$/, "");
  } catch (e) { return null; }
}

async function finishCharmMigration(productId) {
  console.log(`Finishing migration for all assets in charm: ${productId}`);
  
  try {
    const mediaItems = await db.media.findMany({
        where: { memory: { productId } }
    });

    console.log(`Processing ${mediaItems.length} items...`);

    for (const item of mediaItems) {
      const publicId = getPublicIdFromUrl(item.url);
      if (!publicId) continue;

      try {
        // We check if it's already authenticated
        console.log(`Migrating ${publicId}...`);
        
        // Attempt to find it in 'private' or 'upload' and move to 'authenticated'
        let foundType = null;
        for (const type of ['private', 'upload']) {
            try {
                await cloudinary.api.resource(publicId, { type });
                foundType = type;
                break;
            } catch (e) {}
        }

        if (foundType) {
            console.log(`Found in ${foundType}. Moving to authenticated...`);
            // We use the full URL to re-upload with correct type and invalidate cache
            // We need to construct a valid URL for the current type
            const resource = await cloudinary.api.resource(publicId, { type: foundType });
            
            await cloudinary.uploader.upload(resource.secure_url, {
                public_id: publicId,
                type: 'authenticated',
                invalidate: true,
                overwrite: true
            });

            // Cleanup old type
            await cloudinary.uploader.destroy(publicId, { type: foundType, invalidate: true });
            console.log(`Successfully moved ${publicId} to authenticated.`);
        } else {
            // Check if it's already authenticated
            try {
                await cloudinary.api.resource(publicId, { type: 'authenticated' });
                console.log(`${publicId} is already authenticated.`);
            } catch (e) {
                console.warn(`Could not find ${publicId} in any location!`);
            }
        }
      } catch (err) {
        console.error(`Failed to process ${publicId}:`, err.message);
      }
    }

    console.log('Migration finished for this charm.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

finishCharmMigration('cmkywmmux0000vmm13r702g4i');
