import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";

import { uploadActivityImage } from "../controllers/activityImageController";

import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  listPublicActivities,
  publishActivity,
  unpublishActivity,
  updateActivity,
} from "../controllers/activityController";

const router = Router();

/* ============================================================
   IMAGE UPLOAD
============================================================ */

const MAX_ACTIVITY_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_ACTIVITY_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const activityImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ACTIVITY_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_ACTIVITY_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, and WebP images are allowed."));
      return;
    }
    callback(null, true);
  },
});

const parseActivityImage = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  activityImageUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge
        ? "Image must be 5 MB or smaller."
        : error instanceof Error
          ? error.message
          : "Unable to process image upload.",
    });
  });
};

/* ============================================================
   AUTH TYPES
============================================================ */

interface ActivityTokenPart {
  id?: string | number;
  _id?: string | number;
  userId?: string | number;
  volunteerId?: string | number;
  staffId?: string | number;
  name?: string;
  role?: string;
  staffRole?: string;
  status?: string;
  volunteer?: ActivityTokenPart;
  user?: ActivityTokenPart;
}

type ActivityRequest = Request & {
  volunteer?: ActivityTokenPart;
  user?: ActivityTokenPart;
};

const ALLOWED_ROLES = new Set([
  "volunteer",
  "admin",
  "staff",
  "mentor",
  "manager",
  "head",
]);

/* ============================================================
   AUTH MIDDLEWARE

   Matches the current backend's JWT secret names. Verified token
   data is attached to req.volunteer for activityController.ts.
============================================================ */

const requireActivityUser = (
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
        message: "Authentication required to manage activities.",
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
        message: "JWT secret is not configured on the server.",
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as ActivityTokenPart;
    const nested = decoded.volunteer || decoded.user || {};
    const identity =
      decoded.id ??
      decoded._id ??
      decoded.userId ??
      decoded.volunteerId ??
      decoded.staffId ??
      nested.id ??
      nested._id ??
      nested.userId ??
      nested.volunteerId;

    if (identity === undefined || identity === null || String(identity).trim() === "") {
      res.status(401).json({
        success: false,
        message: "Account ID is missing from the login token.",
      });
      return;
    }

    const role = String(
      decoded.role ?? decoded.staffRole ?? nested.role ?? nested.staffRole ?? "",
    ).trim().toLowerCase();

    if (!role || !ALLOWED_ROLES.has(role)) {
      res.status(403).json({
        success: false,
        message: "This account is not permitted to manage activities.",
      });
      return;
    }

    if (role === "volunteer") {
      const status = String(decoded.status ?? nested.status ?? "")
        .trim()
        .toLowerCase();

      if (status && status !== "approved") {
        res.status(403).json({
          success: false,
          message: status === "pending"
            ? "Your volunteer account is still under review."
            : status === "rejected"
              ? "Your volunteer account has been rejected."
              : "Your volunteer account is not approved.",
        });
        return;
      }
    }

    (req as ActivityRequest).volunteer = decoded;
    next();
  } catch (error) {
    console.error("[ACTIVITY AUTH ERROR]", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

/* ============================================================
   PUBLIC ROUTES
   Keep /public before /:id so Express does not treat "public"
   as an activity ID.
============================================================ */

// Authenticated upload: multipart/form-data, field name `image`.
// POST /api/activities/upload-image
router.post(
  "/upload-image",
  requireActivityUser,
  parseActivityImage,
  uploadActivityImage,
);

// GET /api/activities/public
// Public citizens can view only published, active activities.
router.get("/public", listPublicActivities);

/* ============================================================
   AUTHENTICATED MANAGEMENT ROUTES
============================================================ */

// GET /api/activities?activityType=sports-games&status=draft
router.get("/", requireActivityUser, listActivities);

// POST /api/activities
router.post("/", requireActivityUser, createActivity);

// GET /api/activities/:id
router.get("/:id", requireActivityUser, getActivity);

// PUT /api/activities/:id
router.put("/:id", requireActivityUser, updateActivity);

// DELETE /api/activities/:id
router.delete("/:id", requireActivityUser, deleteActivity);

// PATCH /api/activities/:id/publish
router.patch("/:id/publish", requireActivityUser, publishActivity);

// PATCH /api/activities/:id/unpublish
router.patch("/:id/unpublish", requireActivityUser, unpublishActivity);

export default router;
