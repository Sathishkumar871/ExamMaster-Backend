import { Router } from "express";

import {
  createExam,
  getTeacherExams,
  getPublishedMockExams,
  getExamById,
  publishExam,
  startExam,
  submitExam,
  deleteExam,
} from "../controllers/examController";

const router = Router();

// ============================================================
// MOCK EXAM MANAGEMENT
// ============================================================

// Create mock exam
router.post("/create", createExam);

// Get teacher's mock exams
router.get("/teacher", getTeacherExams);

// Get published mock exams
// Student can use this to see available mock tests
router.get("/published", getPublishedMockExams);

// Get single mock exam
router.get("/:id", getExamById);

// Publish mock exam
router.patch("/:id/publish", publishExam);

// Delete mock exam
router.delete("/:id", deleteExam);

// ============================================================
// SECURE STUDENT EXAM FLOW
// ============================================================

// Start mock exam
// Creates ExamSession
// Sends questions WITHOUT correctAnswer
router.post("/start", startExam);

// Submit mock exam
// Backend checks correctAnswer
// Backend calculates score
// Backend creates Result
router.post("/submit", submitExam);

export default router;