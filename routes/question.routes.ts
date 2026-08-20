import { Router } from "express";
import multer from "multer";
import * as questionController from "../controllers/questionController";
import { getDailyTestQuestions } from "../controllers/dailyTestController";
import * as mockTestController from "../controllers/mockTestController";
const router = Router();

const upload = multer({
  dest: "uploads/",
});

// ============================================================
// ADMIN / TEACHER
// ============================================================

// Publish all
router.put(
  "/publish-all",
  questionController.publishAllQuestions
);

// Delete all
router.delete(
  "/delete-all",
  questionController.deleteAllQuestions
);

// Parse PDF
router.post(
  "/parse-pdf",
  upload.single("pdfFile"),
  questionController.parseAndSavePdfQuestions
);

// ============================================================
// STUDENT QUESTIONS
// ============================================================

// Published questions
router.get(
  "/published",
  questionController.getPublishedQuestions
);

// Student-specific questions
router.get(
  "/student",
  questionController.getStudentQuestions
);

// Questions by category
router.get(
  "/category/:category",
  questionController.getQuestionsByCategory
);

// ============================================================
// ALL QUESTIONS
// ============================================================

// Teacher/Admin dashboard
router.get(
  "/",
  questionController.getAllQuestions
);

router.get(
  "/mock-tests",
  mockTestController.getMockTestQuestions
);
router.get(
    "/daily-tests", 
     getDailyTestQuestions);
// ============================================================
// QUESTION CRUD
// ============================================================

router.post(
  "/",
  questionController.createQuestion
);

router.put(
  "/:id",
  questionController.updateQuestion
);

router.delete(
  "/:id",
  questionController.deleteQuestionById
);

// ============================================================
// RESULT
// ============================================================

router.post(
  "/exams/submit",
  questionController.submitTestResult
);

export default router;