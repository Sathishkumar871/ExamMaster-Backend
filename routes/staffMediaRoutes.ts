import { NextFunction, Response, Router } from "express";
import multer from "multer";

import {
  deleteStaffMedia,
  listStaffMedia,
  updateStaffMedia,
  uploadStaffMedia,
} from "../controllers/staffMediaController";
import { portalAuth } from "../middleware/portalAuth";
import type { PortalAuthenticatedRequest } from "../middleware/portalAuth";

const router = Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const isImage = file.mimetype.toLowerCase().startsWith("image/");
    const isVideo = file.mimetype.toLowerCase().startsWith("video/");

    if (!isImage && !isVideo) {
      callback(new Error("Only image and video files are supported."));
      return;
    }

    callback(null, true);
  },
});

function requireStaffPortal(
  req: PortalAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const role = req.portalUser?.role;

  if (role !== "staff" && role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Staff portal access is required.",
    });
    return;
  }

  next();
}

function parseSingleUpload(
  req: PortalAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(isTooLarge ? 413 : 400).json({
        success: false,
        message: isTooLarge
          ? "File size must be 50 MB or less."
          : "Unable to receive this file.",
      });
      return;
    }

    if (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error
          ? error.message
          : "Only image and video files are supported.",
      });
      return;
    }

    next();
  });
}

router.use(portalAuth);
router.use(requireStaffPortal);

router.get("/", listStaffMedia);
router.post("/upload", parseSingleUpload, uploadStaffMedia);
router.patch("/:id", updateStaffMedia);
router.delete("/:id", deleteStaffMedia);

export default router;
