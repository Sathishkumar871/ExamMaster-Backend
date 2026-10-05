import {
  Request,
  Response,
  Router,
} from "express";

import {
  getPublicCommunityUpdateById,
  getPublicCommunityUpdates,
} from "../controllers/communityUpdateController";

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// PUBLIC COMMUNITY UPDATES
//
// Login అవసరం లేదు.
//
// User/Citizen app ఈ routes ద్వారా:
//   • Published updates
//   • Active updates
//   • Non-expired updates
//   • Location-matching updates
//   • Category-wise updates
//
// పొందుతుంది.
// ============================================================

// ============================================================
// GET PUBLIC COMMUNITY UPDATES
//
// GET /api/community-updates
//
// Examples:
//
// All public updates:
// GET /api/community-updates
//
// Medical:
// GET /api/community-updates?category=medical
//
// Education:
// GET /api/community-updates?category=education
//
// Government Schemes:
// GET /api/community-updates?category=government_scheme
//
// Jobs:
// GET /api/community-updates?category=jobs
//
// Youth Meetings:
// GET /api/community-updates?category=youth_meeting
//
// Location:
// GET /api/community-updates
//   ?state=Andhra%20Pradesh
//   &district=East%20Godavari
//   &mandal=Korukonda
//   &village=Srirangapatnam
//
// Search:
// GET /api/community-updates?search=camp
//
// Pagination:
// GET /api/community-updates?page=1&limit=20
// ============================================================

router.get(
  "/",
  getPublicCommunityUpdates,
);

// ============================================================
// GET SINGLE PUBLIC COMMUNITY UPDATE
//
// GET /api/community-updates/:id
//
// Example:
//
// GET /api/community-updates/671234abcd
//
// Location can also be supplied:
//
// GET /api/community-updates/671234abcd
//   ?state=Andhra%20Pradesh
//   &district=East%20Godavari
//   &mandal=Korukonda
//   &village=Srirangapatnam
//
// ============================================================

router.get(
  "/:id",
  getPublicCommunityUpdateById,
);

// ============================================================
// EXPORT ROUTER
// ============================================================

export default router;