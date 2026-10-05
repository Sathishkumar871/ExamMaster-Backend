import {
  NextFunction,
  Request,
  Response,
  Router,
} from "express";

import jwt from "jsonwebtoken";

import {
  createCommunityUpdate,
  deleteCommunityUpdate,
  getVolunteerCommunityUpdateById,
  getVolunteerCommunityUpdates,
  publishCommunityUpdate,
  unpublishCommunityUpdate,
  updateCommunityUpdate,
} from "../controllers/communityUpdateController";

// ============================================================
// ROUTER
// ============================================================

const router = Router();

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
//
// All volunteer community-update routes use this middleware.
// ============================================================

const requireVolunteer = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // --------------------------------------------------------
    // AUTHORIZATION HEADER
    // --------------------------------------------------------

    const authorization =
      req.headers.authorization || "";

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      res.status(401).json({
        success: false,
        message:
          "Volunteer authentication required.",
      });

      return;
    }

    // --------------------------------------------------------
    // JWT SECRET
    // --------------------------------------------------------

    const secret =
      process.env.JWT_SECRET ||
      process.env.VOLUNTEER_JWT_SECRET ||
      process.env.STAFF_JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message:
          "JWT secret is not configured.",
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
      ) as VolunteerToken;

    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    const role = String(
      decoded.role ||
        decoded.volunteer?.role ||
        "",
    )
      .trim()
      .toLowerCase();

    if (
      role &&
      role !== "volunteer"
    ) {
      res.status(403).json({
        success: false,
        message:
          "Only approved volunteers can manage community updates.",
      });

      return;
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------
    //
    // Existing volunteer authentication may not always put
    // status in the token. Therefore:
    //
    // status missing -> allow token through
    // status pending/rejected -> block
    // status approved -> allow
    //
    // --------------------------------------------------------

    const status = String(
      decoded.status ||
        decoded.volunteer?.status ||
        "",
    )
      .trim()
      .toLowerCase();

    if (
      status &&
      status !== "approved"
    ) {
      if (
        status === "pending"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Your volunteer account is still under review.",
        });

        return;
      }

      if (
        status === "rejected"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Your volunteer account has been rejected.",
        });

        return;
      }

      res.status(403).json({
        success: false,
        message:
          "Your volunteer account is not approved.",
      });

      return;
    }

    // --------------------------------------------------------
    // SAVE VERIFIED TOKEN
    // --------------------------------------------------------

    (
      req as VolunteerRequest
    ).volunteer = decoded;

    next();
  } catch (error) {
    console.error(
      "[COMMUNITY UPDATE AUTH ERROR]",
      error,
    );

    res.status(401).json({
      success: false,
      message:
        "Invalid or expired volunteer token.",
    });
  }
};

// ============================================================
// VOLUNTEER COMMUNITY UPDATE ROUTES
// ============================================================

// ------------------------------------------------------------
// GET ALL OWN UPDATES
//
// GET
// /api/volunteer/community-updates
//
// Query examples:
//
// ?category=medical
// ?category=education
// ?category=government_scheme
// ?category=jobs
// ?category=youth_meeting
//
// ?status=draft
// ?status=published
//
// ?search=camp
// ------------------------------------------------------------

router.get(
  "/",
  requireVolunteer,
  getVolunteerCommunityUpdates,
);

// ------------------------------------------------------------
// GET SINGLE OWN UPDATE
//
// GET
// /api/volunteer/community-updates/:id
// ------------------------------------------------------------

router.get(
  "/:id",
  requireVolunteer,
  getVolunteerCommunityUpdateById,
);

// ------------------------------------------------------------
// CREATE
//
// POST
// /api/volunteer/community-updates
// ------------------------------------------------------------

router.post(
  "/",
  requireVolunteer,
  createCommunityUpdate,
);

// ------------------------------------------------------------
// UPDATE
//
// PUT
// /api/volunteer/community-updates/:id
// ------------------------------------------------------------

router.put(
  "/:id",
  requireVolunteer,
  updateCommunityUpdate,
);

// ------------------------------------------------------------
// DELETE
//
// DELETE
// /api/volunteer/community-updates/:id
// ------------------------------------------------------------

router.delete(
  "/:id",
  requireVolunteer,
  deleteCommunityUpdate,
);

// ------------------------------------------------------------
// PUBLISH
//
// PATCH
// /api/volunteer/community-updates/:id/publish
// ------------------------------------------------------------

router.patch(
  "/:id/publish",
  requireVolunteer,
  publishCommunityUpdate,
);

// ------------------------------------------------------------
// UNPUBLISH
//
// PATCH
// /api/volunteer/community-updates/:id/unpublish
// ------------------------------------------------------------

router.patch(
  "/:id/unpublish",
  requireVolunteer,
  unpublishCommunityUpdate,
);

// ============================================================
// EXPORT
// ============================================================

export default router;