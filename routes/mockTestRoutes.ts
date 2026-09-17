
import { Router } from "express";

import {
  getMockTestQuestions,
  getMissedMockExams, // ✅ ADD THIS
  startMockTest,
  saveMockTestProgress,
  mockTestHeartbeat,
  getMockSession,
  submitMockTest,
} from "../controllers/mockTestController";

// ============================================================
// MOCK TEST ROUTER
// ============================================================

const router = Router();

// ============================================================
// 1. GET MOCK TEST QUESTIONS
// ============================================================

// GET
// /api/mock-test/questions

router.get(
  "/questions",
  getMockTestQuestions
);

// ============================================================
// 2. MISSED MOCK TESTS
// ============================================================
//
// GET
// /api/mock-test/missed-tests
//
// Query:
// ?studentId=STUDENT_ID
//
// Returns exams whose 24-hour access window has ended
// and which the student has not completed.
// ============================================================

router.get(
  "/missed-tests",
  getMissedMockExams
);

// ============================================================
// 3. START / RESUME MOCK TEST
// ============================================================

// POST
// /api/mock-test/start

router.post(
  "/start",
  startMockTest
);

// ============================================================
// 4. SAVE EXAM PROGRESS
// ============================================================

// POST
// /api/mock-test/progress

router.post(
  "/progress",
  saveMockTestProgress
);

// ============================================================
// 5. HEARTBEAT
// ============================================================

// POST
// /api/mock-test/heartbeat

router.post(
  "/heartbeat",
  mockTestHeartbeat
);

// ============================================================
// 6. GET EXISTING SESSION
// ============================================================

// GET
// /api/mock-test/session/:examId

router.get(
  "/session/:examId",
  getMockSession
);

// ============================================================
// 7. SUBMIT MOCK TEST
// ============================================================

// POST
// /api/mock-test/submit

router.post(
  "/submit",
  submitMockTest
);

// ============================================================
// EXPORT
// ============================================================

export default router;

