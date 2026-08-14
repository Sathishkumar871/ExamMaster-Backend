import express from "express";

import {
  getSubjectExam,
  startSubjectExam,
  submitSubjectExam,
} from "../controllers/subjectExamController";

const router =
  express.Router();

// ============================================================
// GET SINGLE SUBJECT EXAM
// ============================================================

router.get(
  "/:id",
  getSubjectExam
);

// ============================================================
// START SUBJECT EXAM
// ============================================================

router.post(
  "/:id/start",
  startSubjectExam
);

// ============================================================
// SUBMIT SUBJECT EXAM
// ============================================================

router.post(
  "/:id/submit",
  submitSubjectExam
);

export default router;