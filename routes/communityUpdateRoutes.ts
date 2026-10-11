import { Router } from "express";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import jwt from "jsonwebtoken";
import multer from "multer";

import {
  createCommunityUpdate,
  deleteCommunityUpdate,
  getVolunteerCommunityUpdateById,
  getVolunteerCommunityUpdates,
  publishCommunityUpdate,
  unpublishCommunityUpdate,
  updateCommunityUpdate,
} from "../controllers/communityUpdateController";

import {
  uploadCommunityUpdateImage,
} from "../controllers/communityUpdateImageController";

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// IMAGE UPLOAD CONFIGURATION
// ============================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, and WebP images are allowed."));
      return;
    }
    callback(null, true);
  },
});

// Convert Multer errors into a predictable JSON response.
const parseCommunityImage: RequestHandler = (req, res, next) => {
  imageUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const isTooLarge =
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE";

    const message = isTooLarge
      ? "Image must be 5 MB or smaller."
      : error instanceof Error
        ? error.message
        : "Unable to process image upload.";

    res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message,
    });
  });
};

// ============================================================
// TYPES
// ============================================================

interface VolunteerToken {
  id?: string;
  _id?: string;
  userId?: string;
  volunteerId?: string;
  name?: string;
  role?: string;
  status?: string;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
  volunteer?: {
    id?: string;
    _id?: string;
    name?: string;
    state?: string;
    district?: string;
    mandal?: string;
    village?: string;
    role?: string;
    status?: string;
  };
}

type VolunteerRequest = Request & {
  volunteer?: VolunteerToken;
};

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

const requireVolunteer = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      res.status(401).json({
        success: false,
        message: "Volunteer authentication required.",
      });
      return;
    }

    const secret =
      process.env.JWT_SECRET ||
      process.env.VOLUNTEER_JWT_SECRET ||
      process.env.STAFF_JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message: "JWT secret is not configured.",
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as VolunteerToken;

    const role = String(
      decoded.role || decoded.volunteer?.role || "",
    ).trim().toLowerCase();

    if (role && role !== "volunteer") {
      res.status(403).json({
        success: false,
        message: "Only approved volunteers can manage community updates.",
      });
      return;
    }

    const status = String(
      decoded.status || decoded.volunteer?.status || "",
    ).trim().toLowerCase();

    if (status && status !== "approved") {
      if (status === "pending") {
        res.status(403).json({
          success: false,
          message: "Your volunteer account is still under review.",
        });
        return;
      }

      if (status === "rejected") {
        res.status(403).json({
          success: false,
          message: "Your volunteer account has been rejected.",
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: "Your volunteer account is not approved.",
      });
      return;
    }

    (req as VolunteerRequest).volunteer = decoded;
    next();
  } catch (error) {
    console.error("[COMMUNITY UPDATE AUTH ERROR]", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired volunteer token.",
    });
  }
};

// ============================================================
// VOLUNTEER COMMUNITY UPDATE ROUTES
// ============================================================

// Upload image to Cloudinary using backend credentials.
// Multipart field name must be `image`.
// POST /api/volunteer/community-updates/upload-image
router.post(
  "/upload-image",
  requireVolunteer,
  parseCommunityImage,
  uploadCommunityUpdateImage,
);

// GET all of the signed-in volunteer's updates.
router.get(
  "/",
  requireVolunteer,
  getVolunteerCommunityUpdates,
);

// GET one update owned by the signed-in volunteer.
router.get(
  "/:id",
  requireVolunteer,
  getVolunteerCommunityUpdateById,
);

// Create an update.
router.post(
  "/",
  requireVolunteer,
  createCommunityUpdate,
);

// Update an existing update.
router.put(
  "/:id",
  requireVolunteer,
  updateCommunityUpdate,
);

// Delete an update.
router.delete(
  "/:id",
  requireVolunteer,
  deleteCommunityUpdate,
);

// Publish an update.
router.patch(
  "/:id/publish",
  requireVolunteer,
  publishCommunityUpdate,
);

// Unpublish an update.
router.patch(
  "/:id/unpublish",
  requireVolunteer,
  unpublishCommunityUpdate,
);

export default router;
