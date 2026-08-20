import express from "express";
import { getDailyTestQuestions } from "../controllers/dailyTestController";

const router = express.Router();

// GET /api/daily-tests
router.get("/", getDailyTestQuestions);

export default router;