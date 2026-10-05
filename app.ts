import express from "express";
import cors from "cors";

import "dotenv/config";

// ============================================================
// ROUTES
// ============================================================

import studentRoutes from "./routes/studentRoutes";
import resultRoutes from "./routes/resultRoutes";
import teacherRoutes from "./routes/teacherRoutes";
import staffRoutes from "./routes/staffRoutes";
import mentorRoutes from "./routes/mentorRoutes";
import managerRoutes from "./routes/managerRoutes";
import mockTestRoutes from "./routes/mockTestRoutes";
import headRoutes from "./routes/headRoutes";
import dailyTestRoutes from "./routes/dailyTestRoutes";
import subjectRoutes from "./routes/subjectRoutes";
import questionRoutes from "./routes/question.routes";
import departmentFeedbackRoutes from "./routes/departmentFeedbackRoutes";
import studentProgressRoutes from "./routes/studentProgressRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import testRoutes from "./routes/testRoutes";
import facultyRoutes from "./routes/facultyRoutes";
import leaderboardRoutes from "./routes/leaderboardroutes";
import aiStrategyRoutes from "./routes/aiStrategyRoutes";
import academicRoutes from "./routes/academicRoutes";
import otpRoutes from "./routes/otpRoutes";
import locationsRouter from "./routes/locations";
import janasevaRegisterRouter from "./routes/janasevaRegister";
import janasevaAuthRouter from "./routes/janasevaAuth";
import janasevaProfileRouter from "./routes/janasevaProfile";
import adminAuthRouter from "./routes/adminAuth";
import volunteerRegistrationRouter from "./routes/volunteerRegistration";
import staffAuthRouter from "./routes/staffAuth";
import homeHeroRouter from "./routes/homeHero";
import volunteerRoutes from "./routes/volunteerRoutes";
import staffVolunteerRoutes from "./routes/staffVolunteerRoutes";
import staffavailabilityRoutes from "./routes/staffAvailabilityRoutes";
import appointmentRoutes from "./routes/appointment.routes";

// ============================================================
// COMMUNITY UPDATE ROUTES
// ============================================================

import communityUpdateRoutes from "./routes/communityUpdateRoutes";
import publicCommunityUpdateRoutes from "./routes/publicCommunityUpdateRoutes";

// ============================================================
// SERVICES
// ============================================================

import { publishScheduledMockTests } from "./services/mockTestPublisher";

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ============================================================
// STUDENT API
// ============================================================

app.use(
  "/api/student",
  studentRoutes,
);

app.use(
  "/api/otp",
  otpRoutes,
);

// ============================================================
// RESULT API
// ============================================================

app.use(
  "/api/results",
  resultRoutes,
);

app.use(
  "/api/result",
  resultRoutes,
);

// ============================================================
// TEACHER API
// ============================================================

app.use(
  "/api/teacher",
  teacherRoutes,
);

// ============================================================
// FACULTY API
// ============================================================

app.use(
  "/api/faculty",
  facultyRoutes,
);

// ============================================================
// STAFF API
// ============================================================

app.use(
  "/api/staff",
  staffRoutes,
);

// ============================================================
// MENTOR API
// ============================================================

app.use(
  "/api/mentor",
  mentorRoutes,
);

// ============================================================
// MANAGER API
// ============================================================

app.use(
  "/api/manager",
  managerRoutes,
);

// ============================================================
// HEAD API
// ============================================================

app.use(
  "/api/head",
  headRoutes,
);

// ============================================================
// DAILY TEST API
// ============================================================

app.use(
  "/api/daily-tests",
  dailyTestRoutes,
);

app.use(
  "/api/questions",
  questionRoutes,
);

app.use(
  "/api/subjects",
  subjectRoutes,
);

// ============================================================
// QUESTION BANK / AI STRATEGY
// ============================================================

app.use(
  "/api/ai-strategy",
  aiStrategyRoutes,
);

app.use(
  "/api/academic",
  academicRoutes,
);

// ============================================================
// TESTS / PUBLISH API
// ============================================================

app.use(
  "/api/tests",
  testRoutes,
);

app.use(
  "/api/mock-test",
  mockTestRoutes,
);

// ============================================================
// STUDENT PROGRESS
// ============================================================

app.use(
  "/api/student-progress",
  studentProgressRoutes,
);

// ============================================================
// COMPLAINT / LEADERBOARD API
// ============================================================

app.use(
  "/api",
  leaderboardRoutes,
);

app.use(
  "/api/complaints",
  complaintRoutes,
);

app.use(
  "/api/department-feedback",
  departmentFeedbackRoutes,
);

// ============================================================
// LOCATION API
// ============================================================

app.use(
  "/api/locations",
  locationsRouter,
);

// ============================================================
// JANASEVA REGISTER
// ============================================================

app.use(
  "/api/janaseva",
  janasevaRegisterRouter,
);

// ============================================================
// JANASEVA AUTH
// ============================================================

app.use(
  "/api/janaseva",
  janasevaAuthRouter,
);

// ============================================================
// JANASEVA PROFILE
// ============================================================

app.use(
  "/api/janaseva",
  janasevaProfileRouter,
);

// ============================================================
// ADMIN AUTH
// ============================================================

app.use(
  "/api/admin/auth",
  adminAuthRouter,
);

// ============================================================
// VOLUNTEER REGISTRATION
// ============================================================

app.use(
  "/api/volunteers",
  volunteerRegistrationRouter,
);

// ============================================================
// STAFF AUTH
// ============================================================

app.use(
  "/api/staff/auth",
  staffAuthRouter,
);

// ============================================================
// HOME HERO
// ============================================================

app.use(
  "/api/home/hero",
  homeHeroRouter,
);

// ============================================================
// VOLUNTEER API
// ============================================================

app.use(
  "/api/volunteers",
  volunteerRoutes,
);

// ============================================================
// STAFF VOLUNTEER MANAGEMENT
// ============================================================

app.use(
  "/api/staff",
  staffVolunteerRoutes,
);

// ============================================================
// STAFF AVAILABILITY / SLOTS
// ============================================================

app.use(
  "/api/staff/availability",
  staffavailabilityRoutes,
);
app.use(
  "/api/appointments",
  appointmentRoutes,
);

// ============================================================
// COMMUNITY UPDATES
//
// VOLUNTEER SIDE
//
// Create
// List own updates
// Get single update
// Edit
// Delete
// Publish
// Unpublish
// ============================================================

app.use(
  "/api/volunteer/community-updates",
  communityUpdateRoutes,
);

// ============================================================
// COMMUNITY UPDATES
//
// PUBLIC USER SIDE
//
// Published
// Active
// Non-expired
// Location-matching
// Category-wise
// ============================================================

app.use(
  "/api/community-updates",
  publicCommunityUpdateRoutes,
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "ExamMaster API Running 🚀",
    });
  },
);

// ============================================================
// MOCK TEST AUTO PUBLISHER
// ============================================================

publishScheduledMockTests();

setInterval(
  publishScheduledMockTests,
  30 * 1000,
);

// ============================================================
// 404 API HANDLER
// ============================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message: "API route not found",
      path: req.originalUrl,
    });
  },
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (
    err: any,
    req: any,
    res: any,
    next: any,
  ) => {
    console.error(
      "SERVER ERROR:",
      err,
    );

    return res.status(500).json({
      success: false,
      message:
        err?.message ||
        "Internal Server Error",
    });
  },
);

// ============================================================
// EXPORT APP
// ============================================================

export default app;