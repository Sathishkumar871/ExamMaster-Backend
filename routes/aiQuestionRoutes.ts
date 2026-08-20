import { Router } from "express";

import {
  verifySingleQuestion,
  verifyMultipleQuestions,
  verifyTestQuestions,
  getAIQuestionIssues,
  resolveAIQuestionIssue,
  getAIIssueCount,
} from "../controllers/aiQuestionController";

const router = Router();

// ============================================================
// AI QUESTION VERIFICATION
// ============================================================

// Verify one question
// POST /api/ai/questions/:id/verify
router.post(
  "/questions/:id/verify",
  verifySingleQuestion
);

// Verify selected multiple questions
// POST /api/ai/questions/verify
router.post(
  "/questions/verify",
  verifyMultipleQuestions
);

// Verify all questions belonging to one test
// POST /api/ai/questions/test/:testId/verify
router.post(
  "/questions/test/:testId/verify",
  verifyTestQuestions
);

// ============================================================
// AI ISSUES / BELL
// ============================================================

// Get all unresolved AI issues
// GET /api/ai/questions/issues
router.get(
  "/questions/issues",
  getAIQuestionIssues
);

// Get unresolved issue count
// GET /api/ai/questions/issues/count
router.get(
  "/questions/issues/count",
  getAIIssueCount
);

// Resolve one issue after Head manually fixes it
// PATCH /api/ai/questions/:id/issues/:issueIndex/resolve
router.patch(
  "/questions/:id/issues/:issueIndex/resolve",
  resolveAIQuestionIssue
);

export default router;