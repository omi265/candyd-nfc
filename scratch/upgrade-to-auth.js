require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function upgradeToAuthenticated() {
  try {
    const publicId = 'candyd_memories/byyzqwqfqh6eqwnf1ha8';
    console.log(`Checking resource ${publicId} again...`);
    
    // Check where it is first
    let currentType = 'private';
    try {
        await cloudinary.api.resource(publicId, { type: 'private' });
    } catch (e) {
        console.log('Not in private, checking upload...');
        await cloudinary.api.resource(publicId, { type: 'upload' });
        currentType = 'upload';
    }

    console.log(`Found in ${currentType}. Changing type to "authenticated"...`);
    
    // Changing type is usually done via rename
    const res = await cloudinary.uploader.rename(publicId, publicId, {
      from_type: currentType,
      to_type: 'authenticated',
      overwrite: true
    });
    
    console.log('Success! Result:', JSON.stringify(res, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

upgradeToAuthenticated();
