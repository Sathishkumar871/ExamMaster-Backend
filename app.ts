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
import staffAuthRouter from "./routes/staffAuth";
import staffVolunteerRoutes from "./routes/staffVolunteerRoutes";
import staffavailabilityRoutes from "./routes/staffAvailabilityRoutes";

import mentorRoutes from "./routes/mentorRoutes";
import managerRoutes from "./routes/managerRoutes";
import headRoutes from "./routes/headRoutes";

import mockTestRoutes from "./routes/mockTestRoutes";
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
import volunteerRoutes from "./routes/volunteerRoutes";

import homeHeroRouter from "./routes/homeHero";

import appointmentRoutes from "./routes/appointment.routes";

// ============================================================
// COMMUNITY UPDATE ROUTES
// ============================================================

import communityUpdateRoutes from "./routes/communityUpdateRoutes";
import publicCommunityUpdateRoutes from "./routes/publicCommunityUpdateRoutes";

// ============================================================
// JANASEVA HEALTH ROUTES
// ============================================================

import janasevaHealthRouter from "./routes/janasevaHealth";
import janasevaHealthImageRouter from "./routes/janasevaHealthImage";

// ============================================================
// SEPARATE ACTIVITIES MODULE
// ============================================================

import activityRoutes from "./routes/activityRoutes";

// ============================================================
// STAFF MEDIA ROUTES
// ============================================================

import staffMediaRoutes from "./routes/staffMediaRoutes";
import publicMediaRoutes from "./routes/publicMediaRoutes";

// ============================================================
// SERVICES
// ============================================================

import { publishScheduledMockTests } from "./services/mockTestPublisher";

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// BASIC CONFIG
// ============================================================

app.set("trust proxy", 1);

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    // Reflect request origin. This works for browser/frontend requests
    // while still allowing credentials.
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  }),
);

// ============================================================
// EXPRESS 5 PREFLIGHT
// ============================================================

app.options(
  /.*/,
  cors({
    origin: true,
    credentials: true,
  }),
);

// ============================================================
// BODY PARSERS
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// ACTIVITIES API
// Register before broad /api routers and before the 404 handler.
// Full path: /api/activities/...
// ============================================================

app.use("/api/activities", activityRoutes);

// ============================================================
// PUBLIC STAFF MEDIA API
// Full path: /api/media/public
// Must be registered before any broad /api router and before 404.
// ============================================================

app.use("/api/media", publicMediaRoutes);

// ============================================================
// STUDENT API
// ============================================================

app.use("/api/student", studentRoutes);
app.use("/api/otp", otpRoutes);

// ============================================================
// RESULT API
// ============================================================

app.use("/api/results", resultRoutes);
app.use("/api/result", resultRoutes);

// ============================================================
// TEACHER API
// ============================================================

app.use("/api/teacher", teacherRoutes);

// ============================================================
// FACULTY API
// ============================================================

app.use("/api/faculty", facultyRoutes);

// ============================================================
// STAFF AUTH
// IMPORTANT: Must come before the broader /api/staff route.
// ============================================================

app.use("/api/staff/auth", staffAuthRouter);

// ============================================================
// STAFF MEDIA
// IMPORTANT: Register before broader /api/staff routers.
// Full paths include /api/staff/media/upload and /api/staff/media/:id.
// ============================================================

app.use("/api/staff/media", staffMediaRoutes);

// ============================================================
// STAFF AVAILABILITY / SLOTS
// IMPORTANT: Must come before the broader /api/staff route.
// ============================================================

app.use("/api/staff/availability", staffavailabilityRoutes);

// ============================================================
// STAFF VOLUNTEER MANAGEMENT
// Keep before the broader /api/staff route.
// ============================================================

app.use("/api/staff", staffVolunteerRoutes);

// ============================================================
// STAFF API
// ============================================================

app.use("/api/staff", staffRoutes);

// ============================================================
// MENTOR / MANAGER / HEAD APIs
// ============================================================

app.use("/api/mentor", mentorRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/head", headRoutes);

// ============================================================
// DAILY TEST API
// ============================================================

app.use("/api/daily-tests", dailyTestRoutes);

// ============================================================
// QUESTIONS API
// ============================================================

app.use("/api/questions", questionRoutes);
app.use("/api/subjects", subjectRoutes);

// ============================================================
// QUESTION BANK / AI STRATEGY
// ============================================================

app.use("/api/ai-strategy", aiStrategyRoutes);
app.use("/api/academic", academicRoutes);

// ============================================================
// TESTS / PUBLISH API
// ============================================================

app.use("/api/tests", testRoutes);
app.use("/api/mock-test", mockTestRoutes);

// ============================================================
// STUDENT PROGRESS
// ============================================================

app.use("/api/student-progress", studentProgressRoutes);

// ============================================================
// COMPLAINT / LEADERBOARD API
// ============================================================

app.use("/api", leaderboardRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/department-feedback", departmentFeedbackRoutes);

// ============================================================
// LOCATION API
// ============================================================

app.use("/api/locations", locationsRouter);

// ============================================================
// JANASEVA REGISTER / AUTH / PROFILE
// ============================================================

app.use("/api/janaseva", janasevaRegisterRouter);
app.use("/api/janaseva", janasevaAuthRouter);
app.use("/api/janaseva", janasevaProfileRouter);

// ============================================================
// ADMIN AUTH
// ============================================================

app.use("/api/admin/auth", adminAuthRouter);

// ============================================================
// VOLUNTEER REGISTRATION / API
// ============================================================

app.use("/api/volunteers", volunteerRegistrationRouter);
app.use("/api/volunteers", volunteerRoutes);

// ============================================================
// HOME HERO
// ============================================================

app.use("/api/home/hero", homeHeroRouter);

// ============================================================
// APPOINTMENTS
// ============================================================

app.use("/api/appointments", appointmentRoutes);

// ============================================================
// COMMUNITY UPDATES - VOLUNTEER SIDE
// ============================================================

app.use("/api/volunteer/community-updates", communityUpdateRoutes);

// ============================================================
// COMMUNITY UPDATES - PUBLIC USER SIDE
// ============================================================

app.use("/api/community-updates", publicCommunityUpdateRoutes);

// ============================================================
// JANASEVA HEALTH ASSISTANT
// Full endpoint: POST /api/janaseva/health-assistant
// ============================================================

app.use("/api", janasevaHealthRouter);

// ============================================================
// JANASEVA HEALTH IMAGE ASSISTANT
// Full endpoint: POST /api/janaseva/health-image
// ============================================================

app.use("/api", janasevaHealthImageRouter);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "ExamMaster API Running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API HEALTH
// ============================================================

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// MOCK TEST AUTO PUBLISHER
// ============================================================

publishScheduledMockTests();

setInterval(publishScheduledMockTests, 30 * 1000);

// ============================================================
// 404 API HANDLER
// Keep last, after all route registrations.
// ============================================================

app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);

  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (
    err: any,
    req: any,
    res: any,
    _next: any,
  ) => {
    console.error("SERVER ERROR:", err);

    return res.status(
      err?.statusCode || err?.status || 500,
    ).json({
      success: false,
      message: err?.message || "Internal Server Error",
      path: req?.originalUrl,
    });
  },
);

// ============================================================
// EXPORT APP
// ============================================================

export default app;
