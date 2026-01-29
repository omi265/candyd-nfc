import ImageKit from "imagekit";

let imagekit: any = null;

try {
    if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
        imagekit = new ImageKit({
          publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
          privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
          urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
        });
    }
} catch (e) {
    console.error("ImageKit initialization error:", e);
}

export default imagekit;