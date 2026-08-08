import express from "express";
import {
  registerStudent,
  loginStudent,
  getStudentProfile,
} from "../controllers/studentController";
import { getDailyTests } from "../controllers/dailyTestController"; // 👈 హెడ్ క్రియేట్ చేసిన టెస్ట్‌లను స్టూడెంట్స్ చూడటానికి
import { getStudentQuestions } from "../controllers/questionController"; // 👈 స్టూడెంట్స్ కోసం పబ్లిష్ అయిన క్వశ్చన్స్ తెచ్చుకోవడానికి
import studentAuth from "../middleware/studentAuth"; // 👈 స్టూడెంట్ ఆథెంటికేషన్ మిడిల్‌వేర్

const router = express.Router();

// =================================
// STUDENT REGISTER
// POST /api/student/register
// =================================
router.post("/register", registerStudent);

// =================================
// STUDENT LOGIN
// POST /api/student/login
// =================================
router.post("/login", loginStudent);

// =================================
// STUDENT PROFILE
// GET /api/student/profile/:studentId
// =================================
router.get("/profile/:studentId", studentAuth, getStudentProfile);

// =================================
// 📌 1. GET DAILY TESTS FOR STUDENTS
// GET /api/student/daily-tests
// =================================
router.get(
  "/daily-tests",
  studentAuth,
  (req, res) => {
    req.query.targetPage = "daily"; // హెడ్ క్రియేట్ చేసిన డైలీ టెస్ట్‌లను స్టూడెంట్స్‌కి తెస్తుంది
    return getDailyTests(req, res);
  }
);

// =================================
// 📌 2. GET MOCK TESTS FOR STUDENTS
// GET /api/student/mock-tests
// =================================
router.get(
  "/mock-tests",
  studentAuth,
  (req, res) => {
    req.query.targetPage = "mock"; // హెడ్ క్రియేట్ చేసిన మాక్ టెస్ట్‌లను స్టూడెంట్స్‌కి తెస్తుంది
    return getDailyTests(req, res);
  }
);

// =================================
// 📌 3. GET QUESTIONS FOR STUDENTS (Only Published)
// GET /api/student/questions
// =================================
router.get(
  "/questions",
  studentAuth,
  getStudentQuestions
);

export default router;