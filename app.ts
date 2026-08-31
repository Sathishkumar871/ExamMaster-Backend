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
import headRoutes from "./routes/headRoutes";
import dailyTestRoutes from "./routes/dailyTestRoutes";
import subjectRoutes from "./routes/subjectRoutes";
import questionRoutes from "./routes/question.routes";
import studentProgressRoutes from "./routes/studentProgressRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import testRoutes from "./routes/testRoutes";
import facultyRoutes from "./routes/facultyRoutes";
import leaderboardRoutes from "./routes/leaderboardroutes";
import { publishScheduledMockTests } from "./services/mockTestPublisher";
import aiStrategyRoutes from "./routes/aiStrategyRoutes";
import academicRoutes from "./routes/academicRoutes";
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
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
// ============================================================
// STUDENT API
// ============================================================

app.use(
  "/api/student",
  studentRoutes
);

// ============================================================
// RESULT API
// ============================================================

app.use(
  "/api/results",
  resultRoutes
);

app.use(
  "/api/result",
  resultRoutes
);

// ============================================================
// TEACHER API
// ============================================================

app.use(
  "/api/teacher",
  teacherRoutes
);

// ============================================================
// FACULTY API
// ============================================================

app.use(
  "/api/faculty",
  facultyRoutes
);

// ============================================================
// STAFF API
// ============================================================

app.use(
  "/api/staff",
  staffRoutes
);

// ============================================================
// MENTOR API
// ============================================================

app.use(
  "/api/mentor",
  mentorRoutes
);

// ============================================================
// MANAGER API
// ============================================================

app.use(
  "/api/manager",
  managerRoutes
);

// ============================================================
// HEAD API
// ============================================================

app.use(
  "/api/head",
  headRoutes
);

// ============================================================
// DAILY TEST API
// ============================================================

app.use(
  "/api/daily-tests",
  dailyTestRoutes
);
app.use(
  "/api/questions",
  questionRoutes
);
app.use(
  "/api/subjects",
   subjectRoutes);
// ============================================================
// QUESTION BANK API
// ============================================================
app.use(
  "/api/ai-strategy",
  aiStrategyRoutes
);
app.use(
  "/api/academic", 
  academicRoutes);
// ============================================================
// TESTS / PUBLISH API
// ============================================================

app.use(
  "/api/tests",
  testRoutes
);

// ============================================================
// STUDENT PROGRESS
// ============================================================

app.use(
  "/api/student-progress",
  studentProgressRoutes
);

// ============================================================
// COMPLAINT API
// ============================================================

app.use(
  "/api", 
  leaderboardRoutes);

app.use(
  "/api/complaints",
  complaintRoutes
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
  }
);

publishScheduledMockTests();

    setInterval(
      publishScheduledMockTests,
      30 * 1000
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
  }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (
    err: any,
    req: any,
    res: any,
    next: any
  ) => {
    console.error(
      "SERVER ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err?.message ||
        "Internal Server Error",
    });
  }
);

// ============================================================
// EXPORT APP
// ============================================================

export default app;