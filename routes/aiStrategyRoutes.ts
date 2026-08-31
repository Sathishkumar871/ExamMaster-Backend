import { Router } from "express";

import {
  createStudyGuide,
  createAIQuestions,
} from "../controllers/aiStrategyController";

const router = Router();

// ============================================================
// AI STUDY GUIDE
// ============================================================

router.post(
  "/study-guide",
  createStudyGuide
);

// ============================================================
// AI QUESTION GENERATION
// ============================================================

router.post(
  "/generate-questions",
  createAIQuestions
);

export default router;