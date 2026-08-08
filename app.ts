// src/app.ts

import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import "dotenv/config";


// Routes
import studentRoutes from "./routes/studentRoutes";
import examRoutes from "./routes/examRoutes";
import resultRoutes from "./routes/resultRoutes";
import teacherRoutes from "./routes/teacherRoutes";
import staffRoutes from "./routes/staffRoutes";
import mentorRoutes from "./routes/mentorRoutes";
import managerRoutes from "./routes/managerRoutes";
import headRoutes from "./routes/headRoutes";
import dailyTestRoutes from "./routes/dailyTestRoutes";
import questionRoutes from "./routes/questionRoutes";
import studentProgressRoutes from "./routes/studentProgressRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import testRoutes from "./routes/testRoutes"; // 👈 1. ఇక్కడ testRoutes ఇంపోర్ట్ చేయండి


const app = express();


// ================= MIDDLEWARE =================


app.use(
  cors({
    origin: "*",
    credentials: true
  })
);


app.use(
  express.json({
    limit: "10mb"
  })
);


app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);



// ================= PDF / IMAGE UPLOAD =================


app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: {
      fileSize: 50 * 1024 * 1024
    },
    abortOnLimit: true
  })
);



// ================= STUDENT API =================

app.use(
  "/api/student",
  studentRoutes
);



// ================= EXAM API =================

app.use(
  "/api/exam",
  examRoutes
);



// ================= RESULT API =================

app.use(
  "/api/result",
  resultRoutes
);



// ================= TEACHER API =================

app.use(
  "/api/teacher",
  teacherRoutes
);



// ================= STAFF API =================

app.use(
  "/api/staff",
  staffRoutes
);



// ================= MENTOR API =================

app.use(
  "/api/mentor",
  mentorRoutes
);



// ================= MANAGER API =================

app.use(
  "/api/manager",
  managerRoutes
);



// ================= HEAD API =================

app.use(
  "/api/head",
  headRoutes
);



// ================= DAILY TEST API =================

app.use(
  "/api/daily-tests",
  dailyTestRoutes
);



// ================= QUESTION BANK API =================

app.use(
  "/api/questions",
  questionRoutes
);



// ================= TESTS / PUBLISH API =================

app.use(
  "/api/tests",
  testRoutes
); // 👈 2. ఇక్కడ /api/tests రౌట్‌ను రిజిస్టర్ చేయండి



// ================= STUDENT PROGRESS =================

app.use(
  "/api/student-progress",
  studentProgressRoutes
);



// ================= COMPLAINT API =================

app.use(
  "/api/complaints",
  complaintRoutes
);



// ================= HEALTH CHECK =================


app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,
      message: "ExamMaster API Running 🚀"
    });
  }
);



// ================= ERROR HANDLER =================


app.use(
  (
    err: any,
    req: any,
    res: any,
    next: any
  ) => {
    console.log(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
);



export default app;