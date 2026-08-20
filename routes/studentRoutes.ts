import express from "express";
import {
  registerStudent,
  loginStudent,
  getStudentProfile,
} from "../controllers/studentController";
import { getDailyTestQuestions } from "../controllers/dailyTestController";

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
router.get("/profile/:studentId", getStudentProfile);

// =================================
// 📌 1. GET DAILY TESTS FOR STUDENTS
// GET /api/student/daily-tests
// =================================
router.get(
  "/daily-tests",
  (req, res) => {
    req.query.targetPage = "daily"; 
    return getDailyTestQuestions(req, res); // ఇక్కడ getDailyTestQuestions అని ఉండాలి
  }
);

// =================================
// 📌 2. GET MOCK TESTS FOR STUDENTS
// GET /api/student/mock-tests
// =================================
router.get(
  "/mock-tests",
  (req, res) => {
    req.query.targetPage = "mock"; 
    return getDailyTestQuestions(req, res); // ఇక్కడ కూడా getDailyTestQuestions అని ఉండాలి
  }
);

export default router;