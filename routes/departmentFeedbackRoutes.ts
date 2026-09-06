import express from "express";

import {
  saveMentorAcademicEvaluation,
  getStudentDepartmentFeedback,
  getStudentDepartmentWorkflow,
  getDepartmentFeedback,
  startDepartmentFeedback,
  resolveDepartmentFeedback,
} from "../controllers/departmentFeedbackController";

import staffAuth from "../middleware/staffAuth";

const router = express.Router();

// ============================================================
// 1. MENTOR / STAFF - CREATE ACADEMIC EVALUATION
// ============================================================
// Staff / Mentor complaint or academic evaluation raise chestaru.
// Resolve cheyyaleru.

router.post(
  "/mentor/:studentId",
  staffAuth,
  saveMentorAcademicEvaluation
);

// ============================================================
// 2. GET STUDENT DEPARTMENT FEEDBACK
// ============================================================
// Single student's complete feedback record.

router.get(
  "/student/:studentId",
  getStudentDepartmentFeedback
);

// ============================================================
// 3. GET COMPLETE STUDENT DEPARTMENT WORKFLOW
// ============================================================
// Management
// Director
// Warden
// Current Department
// Current Status
// All Action Plans

router.get(
  "/student/:studentId/workflow",
  getStudentDepartmentWorkflow
);

// ============================================================
// 4. GET DEPARTMENT FEEDBACK QUEUE
// ============================================================
// Supported departments:
// management
// director
// warden
//
// Examples:
// /department/management
// /department/director
// /department/warden

router.get(
  "/department/:department",
  getDepartmentFeedback
);

// ============================================================
// 5. START DEPARTMENT FEEDBACK
// ============================================================
// PENDING → IN_PROGRESS
//
// Existing authentication remains here.

router.patch(
  "/student/:studentId/start",
  staffAuth,
  startDepartmentFeedback
);

// ============================================================
// 6. RESOLVE DEPARTMENT FEEDBACK
// ============================================================
//
// IMPORTANT:
// No staffAuth here.
//
// Resolve should be handled by:
//   Management
//   Director
//   Warden
//   Head
//
// Staff / Mentor only raise the complaint.
//
// Controller:
//   Management → Director
//   Director   → Warden
//   Warden     → Final RESOLVED
//
// ============================================================

router.patch(
  "/student/:studentId/resolve",
  resolveDepartmentFeedback
);

// ============================================================
// EXPORT ROUTER
// ============================================================

export default router;