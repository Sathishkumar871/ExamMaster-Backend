import type { Response } from "express";
import mongoose from "mongoose";
import StaffMedia from "../models/StaffMedia";
import type { PortalAuthenticatedRequest } from "../middleware/portalAuth";

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_API_URL = "https://api.imagekit.io/v1/files";
const MAX_CAPTION_LENGTH = 500;

interface StaffMediaRequest extends PortalAuthenticatedRequest {
  file?: Express.Multer.File;
}

interface ImageKitUploadResponse {
  fileId?: string;
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  fileType?: string;
  size?: number;
  width?: number;
  height?: number;
  message?: string;
  help?: string;
}

function imageKitAuthorization(): string {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is not configured on the server.");
  }
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

function toMediaDto(doc: any) {
  return {
    id: String(doc._id),
    caption: String(doc.caption || ""),
    mediaType: doc.mediaType,
    url: String(doc.url || ""),
    thumbnailUrl: doc.thumbnailUrl || "",
    fileName: String(doc.fileName || "media"),
    mimeType: String(doc.mimeType || ""),
    size: Number(doc.size || 0),
    isPublished: Boolean(doc.isPublished),
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function validMediaId(value: unknown): string | null {
  const id = String(value ?? "");
  return mongoose.isValidObjectId(id) ? id : null;
}

async function tryDeleteImageKitFile(fileId: string): Promise<void> {
  const response = await fetch(`${IMAGEKIT_API_URL}/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: {
      Authorization: imageKitAuthorization(),
      Accept: "application/json",
    },
  });

  if (!response.ok && response.status !== 404) {
    const message = await response.text().catch(() => "");
    throw new Error(`ImageKit delete failed (${response.status}): ${message.slice(0, 500)}`);
  }
}

/* =========================================================
   GET STAFF LIBRARY
   GET /api/staff/media
========================================================= */
export async function listStaffMedia(
  _req: PortalAuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const documents = await StaffMedia.find({})
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    res.status(200).json({
      success: true,
      count: documents.length,
      items: documents.map(toMediaDto),
    });
  } catch (error) {
    console.error("STAFF MEDIA LIST ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load the media library.",
    });
  }
}

/* =========================================================
   UPLOAD TO IMAGEKIT AND SAVE TO MONGODB
   POST /api/staff/media/upload
   Multipart fields: file, caption, isPublished
========================================================= */
export async function uploadStaffMedia(
  req: StaffMediaRequest,
  res: Response,
): Promise<void> {
  let uploadedFileId = "";

  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: "Choose an image or video to upload.",
      });
      return;
    }

    const caption = String(req.body?.caption ?? "").trim();
    if (!caption) {
      res.status(400).json({
        success: false,
        field: "caption",
        message: "A caption is required before publishing media.",
      });
      return;
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      res.status(400).json({
        success: false,
        field: "caption",
        message: `Caption must be ${MAX_CAPTION_LENGTH} characters or less.`,
      });
      return;
    }

    const mimetype = String(file.mimetype || "").toLowerCase();
    const mediaType = mimetype.startsWith("video/") ? "video" : mimetype.startsWith("image/") ? "image" : null;
    if (!mediaType) {
      res.status(400).json({
        success: false,
        message: "Only image and video files are supported.",
      });
      return;
    }

    const isPublished = String(req.body?.isPublished ?? "false").toLowerCase() === "true";
    const authorization = imageKitAuthorization();
    const form = new FormData();
    const bytes = new Uint8Array(file.buffer);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: file.mimetype });

    form.append("file", blob, file.originalname);
    form.append("fileName", file.originalname);
    form.append("folder", "/janaseva/staff-media");
    form.append("useUniqueFileName", "true");
    form.append("tags", "janaseva,staff-media");

    const imageKitResponse = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
      body: form,
    });

    const imageKitData = await imageKitResponse.json().catch(() => ({})) as ImageKitUploadResponse;

    if (!imageKitResponse.ok || !imageKitData.fileId || !imageKitData.url) {
      console.error("IMAGEKIT UPLOAD ERROR:", imageKitResponse.status, imageKitData);
      res.status(502).json({
        success: false,
        message: imageKitData.message || "The media upload provider could not accept this file. Check ImageKit settings and file-size limits.",
      });
      return;
    }

    uploadedFileId = imageKitData.fileId;
    const now = new Date();
    const record = await StaffMedia.create({
      caption,
      mediaType,
      url: imageKitData.url,
      thumbnailUrl: imageKitData.thumbnailUrl || "",
      imageKitFileId: imageKitData.fileId,
      fileName: String(imageKitData.name || file.originalname).slice(0, 255),
      mimeType: file.mimetype,
      size: Number(imageKitData.size ?? file.size),
      isPublished,
      publishedAt: isPublished ? now : null,
      createdBy: String(req.portalUser?.userId || "staff"),
    });

    res.status(201).json({
      success: true,
      message: isPublished ? "Media uploaded and published successfully." : "Media uploaded as a draft.",
      item: toMediaDto(record),
    });
  } catch (error: any) {
    console.error("STAFF MEDIA UPLOAD ERROR:", error);

    // If ImageKit accepted the file but the database write failed, clean up the orphaned file.
    if (uploadedFileId && process.env.IMAGEKIT_PRIVATE_KEY) {
      try {
        await tryDeleteImageKitFile(uploadedFileId);
      } catch (cleanupError) {
        console.error("IMAGEKIT ORPHAN CLEANUP ERROR:", cleanupError);
      }
    }

    const missingKey = !process.env.IMAGEKIT_PRIVATE_KEY;
    res.status(missingKey ? 503 : 500).json({
      success: false,
      message: missingKey
        ? "ImageKit is not configured on the backend. Add IMAGEKIT_PRIVATE_KEY to the server environment."
        : "Unable to upload media. Please try again.",
    });
  }
}

/* =========================================================
   UPDATE CAPTION OR PUBLISH STATE
   PATCH /api/staff/media/:id
========================================================= */
export async function updateStaffMedia(
  req: PortalAuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const id = validMediaId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid media ID." });
      return;
    }

    const record = await StaffMedia.findById(id);
    if (!record) {
      res.status(404).json({ success: false, message: "Media item not found." });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (req.body?.caption !== undefined) {
      if (typeof req.body.caption !== "string") {
        res.status(400).json({ success: false, field: "caption", message: "Caption must be text." });
        return;
      }
      const caption = req.body.caption.trim();
      if (!caption || caption.length > MAX_CAPTION_LENGTH) {
        res.status(400).json({
          success: false,
          field: "caption",
          message: `Caption must contain 1 to ${MAX_CAPTION_LENGTH} characters.`,
        });
        return;
      }
      updates.caption = caption;
    }

    if (req.body?.isPublished !== undefined) {
      if (typeof req.body.isPublished !== "boolean") {
        res.status(400).json({ success: false, field: "isPublished", message: "isPublished must be true or false." });
        return;
      }
      updates.isPublished = req.body.isPublished;
      updates.publishedAt = req.body.isPublished
        ? (record.publishedAt || new Date())
        : null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "Provide a caption or publish-state change." });
      return;
    }

    Object.assign(record, updates);
    await record.save();

    res.status(200).json({
      success: true,
      message: "Media updated successfully.",
      item: toMediaDto(record),
    });
  } catch (error) {
    console.error("STAFF MEDIA UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to update this media item." });
  }
}

/* =========================================================
   DELETE MEDIA (IMAGEKIT + MONGODB)
   DELETE /api/staff/media/:id
========================================================= */
export async function deleteStaffMedia(
  req: PortalAuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const id = validMediaId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid media ID." });
      return;
    }

    const record = await StaffMedia.findById(id);
    if (!record) {
      res.status(404).json({ success: false, message: "Media item not found." });
      return;
    }

    if (record.imageKitFileId && process.env.IMAGEKIT_PRIVATE_KEY) {
      try {
        await tryDeleteImageKitFile(record.imageKitFileId);
      } catch (error) {
        console.error("IMAGEKIT DELETE ERROR:", error);
        res.status(502).json({
          success: false,
          message: "The file could not be removed from ImageKit, so its database record was kept. Please retry.",
        });
        return;
      }
    }

    await StaffMedia.deleteOne({ _id: record._id });
    res.status(200).json({ success: true, message: "Media deleted from storage and the app library." });
  } catch (error) {
    console.error("STAFF MEDIA DELETE ERROR:", error);
    res.status(500).json({ success: false, message: "Unable to delete this media item." });
  }
}

/* =========================================================
   PUBLIC MOBILE FEED
   GET /api/media/public
   Only published media is returned.
========================================================= */
export async function listPublicMedia(
  req: PortalAuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const requestedLimit = Number.parseInt(String(req.query.limit ?? "60"), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 60;

    const documents = await StaffMedia.find({ isPublished: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: documents.length,
      items: documents.map(toMediaDto),
    });
  } catch (error) {
    console.error("PUBLIC MEDIA FEED ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load published media.",
    });
  }
}
