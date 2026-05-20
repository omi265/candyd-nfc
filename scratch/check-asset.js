require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkAsset() {
  try {
    const publicId = 'candyd_memories/byyzqwqfqh6eqwnf1ha8';
    
    // Check as 'upload' type
    console.log('--- Checking as "upload" (Public) ---');
    try {
      const resPublic = await cloudinary.api.resource(publicId, { type: 'upload' });
      console.log('Asset found as PUBLIC (upload)! This means migration failed or was partial.');
      console.log('Access Mode:', resPublic.access_mode);
    } catch (e) {
      console.log('Asset NOT found as public upload. (Good)');
    }

    // Check as 'private' type
    console.log('\n--- Checking as "private" ---');
    try {
      const resPrivate = await cloudinary.api.resource(publicId, { type: 'private' });
      console.log('Asset found as PRIVATE.');
      console.log('Access Mode:', resPrivate.access_mode);
      console.log('Full response:', JSON.stringify(resPrivate, null, 2));
    } catch (e) {
      console.log('Asset NOT found as private.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAsset();
