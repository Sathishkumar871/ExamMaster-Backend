import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = async () => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Configuration values check
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary environment variables are missing.");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Test API call
    await cloudinary.api.ping();

    console.log("✅ Cloudinary Connected Successfully");
  } catch (error: any) {
    console.log("❌ Cloudinary Connection Failed");
    console.log(error.message);
  }
};

export { cloudinary, connectCloudinary };