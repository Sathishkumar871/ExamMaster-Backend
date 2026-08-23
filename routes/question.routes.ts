import { Router } from "express";
import multer from "multer";

import * as questionController from "../controllers/questionController";
import { getDailyTestQuestions } from "../controllers/dailyTestController";
import * as mockTestController from "../controllers/mockTestController";

const router = Router();

// ============================================================
// MULTER CONFIGURATION
// ============================================================

// ------------------------------------------------------------
// PDF UPLOAD
// Frontend field name:
// "pdfFile"
// ------------------------------------------------------------
const pdfUpload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});
// ------------------------------------------------------------
// QUESTION IMAGE / DIAGRAM UPLOAD
// Frontend field name:
// "image"
// ------------------------------------------------------------

const imageUpload = multer({
  dest: "uploads/question-images/",
});

// ============================================================
// ADMIN / TEACHER
// ============================================================

// ------------------------------------------------------------
// PUBLISH ALL QUESTIONS
// ------------------------------------------------------------

router.put(
  "/publish-all",
  questionController.publishAllQuestions
);

// ------------------------------------------------------------
// DELETE ALL QUESTIONS
// ------------------------------------------------------------

router.delete(
  "/delete-all",
  questionController.deleteAllQuestions
);

// ============================================================
// PDF UPLOAD + QUESTION PARSING
// ============================================================

// Frontend:
// FormData.append("pdfFile", file)
//
// Supports:
// MCQ
// Table / Match the Following
// Image / Diagram data returned by parser
// ------------------------------------------------------------

router.post(
  "/parse-pdf",
  pdfUpload.single("pdfFile"),
  questionController.parseAndSavePdfQuestions
);

// ============================================================
// QUESTION IMAGE / DIAGRAM UPLOAD
// ============================================================

// Used for:
// Physics diagrams
// Chemistry structures
// Biology diagrams
// Mathematical figures
// Any question image
// ------------------------------------------------------------

router.post(
  "/upload-image",
  imageUpload.single("image"),
  questionController.uploadQuestionImage
);

// ============================================================
// STUDENT QUESTIONS
// ============================================================

// ------------------------------------------------------------
// PUBLISHED QUESTIONS
// ------------------------------------------------------------

router.get(
  "/published",
  questionController.getPublishedQuestions
);

// ------------------------------------------------------------
// STUDENT QUESTIONS WITH FILTERS
//
// Example:
// /student?subject=Physics&className=1st%20PUC&examType=JEE
// ------------------------------------------------------------

router.get(
  "/student",
  questionController.getStudentQuestions
);

// ============================================================
// CATEGORY QUESTIONS
// IMPORTANT:
// This must come before "/:id"
// ============================================================

router.get(
  "/category/:category",
  questionController.getQuestionsByCategory
);

// ============================================================
// SPECIAL TEST QUESTIONS
// IMPORTANT:
// These must come before "/:id"
// ============================================================

// ------------------------------------------------------------
// MOCK TESTS
// ------------------------------------------------------------

router.get(
  "/mock-tests",
  mockTestController.getMockTestQuestions
);

// ------------------------------------------------------------
// DAILY TESTS
// ------------------------------------------------------------

router.get(
  "/daily-tests",
  getDailyTestQuestions
);

// ============================================================
// ALL QUESTIONS
// ============================================================

// Teacher / Admin Question Bank
// ------------------------------------------------------------

router.get(
  "/",
  questionController.getAllQuestions
);

// ============================================================
// CREATE QUESTION
// ============================================================

// IMPORTANT CHANGE:
// imageUpload.single("image")
//
// This allows manual question creation with:
// - normal MCQ
// - diagram question
// - image based question
// - table question
// ------------------------------------------------------------

router.post(
  "/",
  imageUpload.single("questionImage"),
  questionController.createQuestion
);

// ============================================================
// UPDATE QUESTION
// ============================================================

// IMPORTANT CHANGE:
// imageUpload.single("image")
//
// Allows replacing an existing diagram/image.
// ------------------------------------------------------------

router.put(
  "/:id",
  imageUpload.single("questionImage"),
  questionController.updateQuestion
);

// ============================================================
// DELETE QUESTION
// ============================================================

router.delete(
  "/:id",
  questionController.deleteQuestionById
);

// ============================================================
// SUBMIT EXAM / TEST RESULT
// ============================================================

router.post(
  "/exams/submit",
  questionController.submitTestResult
);

// ============================================================
// EXPORT
// ============================================================

export default router;