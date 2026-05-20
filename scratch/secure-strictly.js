require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function secureAssetStrictly() {
  try {
    const publicId = 'candyd_memories/byyzqwqfqh6eqwnf1ha8';
    console.log(`Securing ${publicId} with "authenticated" type and invalidating cache...`);
    
    // 1. Identify current location
    let currentType = 'private';
    try {
        await cloudinary.api.resource(publicId, { type: 'private' });
    } catch (e) {
        try {
            await cloudinary.api.resource(publicId, { type: 'upload' });
            currentType = 'upload';
        } catch (e2) {
            console.log('Resource not found in private or upload.');
            return;
        }
    }

    // 2. Change type to authenticated (Strictly requires signature)
    // Note: To change type to authenticated, we often have to use the upload API with a remote URL
    const resource = await cloudinary.api.resource(publicId, { type: currentType });
    const res = await cloudinary.uploader.upload(resource.secure_url, {
        public_id: publicId,
        type: 'authenticated',
        invalidate: true, // This clears the CDN cache!
        overwrite: true
    });

    // 3. Delete the old version to be sure
    if (currentType !== 'authenticated') {
        await cloudinary.uploader.destroy(publicId, { type: currentType, invalidate: true });
    }
    
    console.log('Success! Asset is now AUTHENTICATED and cache is invalidated.');
    console.log('New URL:', res.secure_url);
  } catch (error) {
    console.error('Error:', error);
  }
}

secureAssetStrictly();
