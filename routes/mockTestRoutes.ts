
import { Router } from "express";

import {
  getMockTestQuestions,
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
//
// GET
// /api/mock-test/questions
//
// Optional query:
//
// ?className=2nd%20PUC
// ?academicYear=2nd%20PUC
// ?examType=NEET
// ?subject=Physics
//
// ============================================================

router.get(
  "/questions",
  getMockTestQuestions
);

// ============================================================
// 2. START / RESUME MOCK TEST
// ============================================================
//
// POST
// /api/mock-test/start
//
// Body:
//
// {
//   "studentId": "STU123456",
//   "examId": "EXAM_ID",
//   "deviceId": "DEVICE_ID"
// }
//
// FIRST TIME:
// Creates ExamSession.
//
// REFRESH:
// Returns same ExamSession.
//
// SECOND DEVICE:
// Takes over active session.
// Previous device becomes invalid.
//
// ============================================================

router.post(
  "/start",
  startMockTest
);

// ============================================================
// 3. SAVE EXAM PROGRESS
// ============================================================
//
// POST
// /api/mock-test/progress
//
// Body:
//
// {
//   "studentId": "STU123456",
//   "sessionId": "SESSION_ID",
//   "currentQuestion": 4,
//   "answers": [
//     {
//       "questionId": "QUESTION_ID",
//       "answer": "Option A"
//     }
//   ],
//   "markedForReview": {
//     "QUESTION_ID": true
//   }
// }
//
// Saves:
//
// - Current question
// - Answers
// - Review marks
//
// ============================================================

router.post(
  "/progress",
  saveMockTestProgress
);

// ============================================================
// 4. HEARTBEAT
// ============================================================
//
// POST
// /api/mock-test/heartbeat
//
// Body:
//
// {
//   "studentId": "STU123456",
//   "sessionId": "SESSION_ID"
// }
//
// Used for:
//
// - Device takeover detection
// - Session replacement detection
// - Timer validation
// - Completed exam detection
//
// ============================================================

router.post(
  "/heartbeat",
  mockTestHeartbeat
);

// ============================================================
// 5. GET EXISTING SESSION
// ============================================================
//
// GET
// /api/mock-test/session/:examId
//
// Used after:
//
// - Browser refresh
// - Mobile refresh
// - App reopen
//
// Returns:
//
// - Same questions
// - Same answers
// - Same current question
// - Same review marks
// - Remaining server time
//
// ============================================================

router.get(
  "/session/:examId",
  getMockSession
);

// ============================================================
// 6. SUBMIT MOCK TEST
// ============================================================
//
// POST
// /api/mock-test/submit
//
// Backend calculates:
//
// - Correct
// - Wrong
// - Unanswered
// - Marks
// - Negative marking
// - Percentage
// - Grade
// - PASS / FAIL
//
// Frontend score is NOT trusted.
//
// ============================================================

router.post(
  "/submit",
  submitMockTest
);

// ============================================================
// EXPORT
// ============================================================

export default router;

