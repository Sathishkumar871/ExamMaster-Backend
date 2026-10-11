import type { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

interface UploadedActivityImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * POST /api/activities/upload-image
 * Expects multipart/form-data with field name `image`.
 * Returns a stable Cloudinary HTTPS URL; the activity model stores that URL
 * in PostgreSQL when the activity itself is saved.
 */
export async function uploadActivityImage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const file = (req as unknown as { file?: UploadedActivityImage }).file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "Please choose an image to upload.",
      });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: "Only JPG, PNG, and WebP images are allowed.",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      res.status(413).json({
        success: false,
        message: "Image must be 5 MB or smaller.",
      });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(500).json({
        success: false,
        message: "Cloudinary is not configured on the backend.",
      });
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "kambala-seva/activities",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }
            if (!result?.secure_url || !result.public_id) {
              reject(new Error("Cloudinary did not return the uploaded image URL."));
              return;
            }
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        );
        stream.end(file.buffer);
      },
    );

    res.status(201).json({
      success: true,
      message: "Activity image uploaded successfully.",
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    });
  } catch (error) {
    console.error("[ACTIVITY IMAGE UPLOAD ERROR]", error);
    res.status(502).json({
      success: false,
      message: "Activity image upload failed. Please try again.",
    });
  }
}
