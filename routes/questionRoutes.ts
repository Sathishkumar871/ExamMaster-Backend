import { Router } from "express";

import {
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions, // ఇది మీ కంట్రోలర్‌లో ఉండాలి
  generateQuestionsFromPDF
} from "../controllers/questionController";

import staffAuth from "../middleware/staffAuth";

const router = Router();

// ==============================
// Create Question
// ==============================
router.post(
  "/create",
  staffAuth,
  createQuestion
);

// ==============================
// Upload PDF & Generate Questions
// ==============================
router.post(
  "/generate-from-pdf",
  staffAuth,
  generateQuestionsFromPDF
);

// ==============================
// Get Question Bank
// ==============================
router.get(
   "/",
   staffAuth,
   getQuestions
);

// ==============================
// ⚠️ DELETE ALL QUESTIONS (ఇది కచ్చితವಾಗಿ /:id కన్నా పైన ఉండాలి)
// ==============================
router.delete(
  "/all",
  staffAuth,
  deleteAllQuestions // మీ కంట్రోలర్ లో ఈ ఫంక్షన్ ఉండాలి
);

// ==============================
// Update Question
// ==============================
router.put(
  "/:id",
  staffAuth,
  updateQuestion
);

// ==============================
// Delete Single Question
// ==============================
router.delete(
  "/:id",
  staffAuth,
  deleteQuestion
);

export default router;