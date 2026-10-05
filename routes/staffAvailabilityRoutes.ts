import {
  NextFunction,
  Request,
  Response,
  Router,
} from "express";

import jwt from "jsonwebtoken";

import {
  getAllAvailability,
  getPublicAvailability,
  getStaffAvailability,
  saveAvailability,
  publishAvailability,
  unpublishAvailability,
  deleteAvailability,
} from "../controllers/availability.controller";

const router = Router();

// ============================================================
// TYPES
// ============================================================

interface StaffToken {
  id?: string;
  _id?: string;
  userId?: string;
  staffId?: string;
  name?: string;

  role?: string;
  staffRole?: string;
  userRole?: string;

  [key: string]: unknown;
}

// ============================================================
// STAFF AUTH
// ============================================================

const requireStaff = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // --------------------------------------------------------
    // GET AUTHORIZATION HEADER
    // --------------------------------------------------------

    const authorization =
      req.headers.authorization || "";

    const parts =
      authorization.trim().split(/\s+/);

    const scheme =
      parts[0] || "";

    const token =
      parts[1] || "";

    // --------------------------------------------------------
    // CHECK TOKEN
    // --------------------------------------------------------

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      res.status(401).json({
        success: false,
        message:
          "Staff authentication required.",
      });

      return;
    }

    // --------------------------------------------------------
    // JWT SECRET
    // --------------------------------------------------------

    const secret =
      process.env.JWT_SECRET ||
      process.env.STAFF_JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message:
          "JWT_SECRET or STAFF_JWT_SECRET is not configured.",
      });

      return;
    }

    // --------------------------------------------------------
    // VERIFY TOKEN
    // --------------------------------------------------------

    const decoded =
      jwt.verify(
        token,
        secret,
      ) as StaffToken;

    // --------------------------------------------------------
    // FIND ROLE
    //
    // Different login systems may store role under
    // role / staffRole / userRole.
    // --------------------------------------------------------

    const rawRole =
      decoded.role ??
      decoded.staffRole ??
      decoded.userRole ??
      "";

    const role = String(
      rawRole,
    )
      .trim()
      .toLowerCase();

    // --------------------------------------------------------
    // DEBUG
    // --------------------------------------------------------

    console.log(
      "[AVAILABILITY AUTH]",
      {
        id:
          decoded.id ||
          decoded._id ||
          decoded.userId ||
          decoded.staffId ||
          null,

        name:
          decoded.name || null,

        role: role || null,
      },
    );

    // --------------------------------------------------------
    // ALLOWED ROLES
    // --------------------------------------------------------

    const allowedRoles = [
      "staff",
      "mentor",
      "manager",
      "head",
    ];

    // --------------------------------------------------------
    // PERMISSION
    // --------------------------------------------------------

    if (
      !allowedRoles.includes(role)
    ) {
      console.warn(
        "[AVAILABILITY AUTH DENIED]",
        {
          role: role || "NO_ROLE",
          allowedRoles,
        },
      );

      res.status(403).json({
        success: false,

        message:
          "You do not have permission to manage availability.",

        role:
          role || null,
      });

      return;
    }

    // --------------------------------------------------------
    // SAVE STAFF IN REQUEST
    // --------------------------------------------------------

    (
      req as Request & {
        staff?: StaffToken;
      }
    ).staff = decoded;

    // --------------------------------------------------------
    // CONTINUE
    // --------------------------------------------------------

    next();
  } catch (error) {
    console.error(
      "[AVAILABILITY AUTH ERROR]",
      error,
    );

    res.status(401).json({
      success: false,
      message:
        "Invalid or expired staff token.",
    });
  }
};

// ============================================================
// PUBLIC ROUTE
//
// NOTE:
// Keep this BEFORE /:date
// ============================================================

router.get(
  "/public/:date",
  getPublicAvailability,
);

// ============================================================
// STAFF - GET ALL
//
// GET
// /api/staff/availability
//
// Optional:
// ?from=2026-10-01&to=2026-10-31
// ============================================================

router.get(
  "/",
  requireStaff,
  getAllAvailability,
);

// ============================================================
// STAFF - GET ONE DATE
//
// GET
// /api/staff/availability/2026-10-02
// ============================================================

router.get(
  "/:date",
  requireStaff,
  getStaffAvailability,
);

// ============================================================
// STAFF - CREATE / UPDATE
//
// PUT
// /api/staff/availability/2026-10-02
// ============================================================

router.put(
  "/:date",
  requireStaff,
  saveAvailability,
);

// ============================================================
// STAFF - PUBLISH
//
// POST
// /api/staff/availability/2026-10-02/publish
// ============================================================

router.post(
  "/:date/publish",
  requireStaff,
  publishAvailability,
);

// ============================================================
// STAFF - UNPUBLISH
//
// POST
// /api/staff/availability/2026-10-02/unpublish
// ============================================================

router.post(
  "/:date/unpublish",
  requireStaff,
  unpublishAvailability,
);

// ============================================================
// STAFF - DELETE
//
// DELETE
// /api/staff/availability/2026-10-02
// ============================================================

router.delete(
  "/:date",
  requireStaff,
  deleteAvailability,
);

// ============================================================
// EXPORT
// ============================================================

export default router;