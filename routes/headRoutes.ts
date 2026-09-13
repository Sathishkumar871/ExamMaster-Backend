
import express from "express";

import {
  getHeadDashboard,
  getPendingStaff,
  approveStaff,
  rejectStaff,

  // Staff / Mentor History
  getMentorHistory,

  // Mentor Management
  getMentors,
  getMentorDetails,
  deactivateMentor,
  reactivateMentor,
  deleteMentor,
  transferMentorStudents,

  // Student Section Management
  changeStudentSection,
} from "../controllers/headController";

import headAuth from "../middleware/headAuth";

const router = express.Router();

// ============================================================
// HEAD DASHBOARD
// GET /api/head/dashboard
// ============================================================

router.get(
  "/dashboard",
  headAuth,
  getHeadDashboard
);

// ============================================================
// PENDING MENTOR + MANAGER REQUESTS
// GET /api/head/pending-staff
// ============================================================

router.get(
  "/pending-staff",
  headAuth,
  getPendingStaff
);

// ============================================================
// APPROVE MENTOR / MANAGER
// PUT /api/head/approve/:id
// ============================================================

router.put(
  "/approve/:id",
  headAuth,
  approveStaff
);

// ============================================================
// REJECT MENTOR / MANAGER
// DELETE /api/head/reject/:id
// ============================================================

router.delete(
  "/reject/:id",
  headAuth,
  rejectStaff
);

// ============================================================
// STAFF / MENTOR HISTORY
// GET /api/head/mentor-history
// ============================================================

router.get(
  "/mentor-history",
  headAuth,
  getMentorHistory
);

// ============================================================
// ALL ACTIVE / INACTIVE MENTORS
// GET /api/head/mentors
// ============================================================

router.get(
  "/mentors",
  headAuth,
  getMentors
);

// ============================================================
// COMPLETE MENTOR DETAILS
// GET /api/head/mentors/:id/details
// ============================================================

router.get(
  "/mentors/:id/details",
  headAuth,
  getMentorDetails
);

// ============================================================
// DEACTIVATE MENTOR
// PATCH /api/head/mentors/:id/deactivate
// ============================================================

router.patch(
  "/mentors/:id/deactivate",
  headAuth,
  deactivateMentor
);

// ============================================================
// REACTIVATE MENTOR
// PATCH /api/head/mentors/:id/reactivate
// ============================================================

router.patch(
  "/mentors/:id/reactivate",
  headAuth,
  reactivateMentor
);

// ============================================================
// REMOVE / DELETE MENTOR
// DELETE /api/head/mentors/:id
// ============================================================
//
// Soft delete:
// Staff record is retained so history is not lost.
// ============================================================

router.delete(
  "/mentors/:id",
  headAuth,
  deleteMentor
);

// ============================================================
// TRANSFER MENTOR STUDENTS
// PATCH /api/head/mentors/:id/transfer
// ============================================================
//
// Old mentor → Replacement mentor
// ============================================================

router.patch(
  "/mentors/:id/transfer",
  headAuth,
  transferMentorStudents
);

// ============================================================
// CHANGE STUDENT SECTION
// PATCH /api/head/students/:studentId/change-section
// ============================================================

router.patch(
  "/students/:studentId/change-section",
  headAuth,
  changeStudentSection
);

export default router;

