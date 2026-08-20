import express from "express";
import { getQuestionsBySubject } from "../controllers/subjectController";

const router = express.Router();

// GET /api/subjects/questions?className=2nd%20PUC&subject=Chemistry&testCategory=daily
router.get("/questions", getQuestionsBySubject);

export default router;