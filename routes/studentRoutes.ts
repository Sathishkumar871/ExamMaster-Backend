import express from "express";

import {
  registerStudent,
  loginStudent,
  getStudentProfile,
  forgotStudentPassword,
  verifyResetPasswordOtp,
  resetStudentPassword,
  logoutStudent,
} from "../controllers/studentController";

import { getDailyTestQuestions } from "../controllers/dailyTestController";

import studentAuth from "../middleware/studentAuth";

const router = express.Router();

// =====================================
// STUDENT REGISTER
// POST /api/student/register
// =====================================
// PUBLIC
router.post(
  "/register",
  registerStudent
);

// =====================================
// STUDENT LOGIN
// POST /api/student/login
// =====================================
// PUBLIC
router.post(
  "/login",
  loginStudent
);

// =====================================
// FORGOT PASSWORD
// POST /api/student/forgot-password
// =====================================
// PUBLIC
router.post(
  "/forgot-password",
  forgotStudentPassword
);

// =====================================
// VERIFY RESET OTP
// POST /api/student/verify-reset-otp
// =====================================
// PUBLIC
router.post(
  "/verify-reset-otp",
  verifyResetPasswordOtp
);

// =====================================
// RESET PASSWORD
// POST /api/student/reset-password
// =====================================
// PUBLIC
router.post(
  "/reset-password",
  resetStudentPassword
);

// =====================================
// STUDENT LOGOUT
// POST /api/student/logout/:studentId
// =====================================
// PROTECTED
router.post(
  "/logout/:studentId",
  studentAuth,
  logoutStudent
);

// =====================================
// STUDENT PROFILE
// GET /api/student/profile/:studentId
// =====================================
// PROTECTED + SINGLE DEVICE
router.get(
  "/profile/:studentId",
  studentAuth,
  getStudentProfile
);

// =====================================
// DAILY TESTS
// GET /api/student/daily-tests
// =====================================
// PROTECTED + SINGLE DEVICE
router.get(
  "/daily-tests",
  studentAuth,
  (req, res) => {
    req.query.targetPage = "daily";

    return getDailyTestQuestions(
      req,
      res
    );
  }
);

// =====================================
// MOCK TESTS
// GET /api/student/mock-tests
// =====================================
// PROTECTED + SINGLE DEVICE
router.get(
  "/mock-tests",
  studentAuth,
  (req, res) => {
    req.query.targetPage = "mock";

    return getDailyTestQuestions(
      req,
      res
    );
  }
);

export default router;