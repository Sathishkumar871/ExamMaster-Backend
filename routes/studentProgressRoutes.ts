import express from "express";

import {
  createProgress,
  getStudentProgress,
  updateProgress,
} from "../controllers/studentProgressController";

const router = express.Router();

router.post("/", createProgress);

router.get("/:studentId", getStudentProgress);

router.put("/:id", updateProgress);

export default router;