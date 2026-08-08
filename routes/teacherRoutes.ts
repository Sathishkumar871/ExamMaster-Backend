import express from "express";

import {

  teacherLogin,

  getStudentsPerformance,

  getTopStudents,

  getSubjectAnalysis

}
from "../controllers/teacherController";


import teacherAuth from "../middleware/teacherAuth";



const router = express.Router();




// =================================
// TEACHER LOGIN
// POST /api/teacher/login
// =================================

router.post(

  "/login",

  teacherLogin

);









// =================================
// TEACHER DASHBOARD
// ONLY AUTHENTICATED TEACHER
// =================================


// GET /api/teacher/students

router.get(

  "/students",

  teacherAuth,

  getStudentsPerformance

);







// GET /api/teacher/top-students

router.get(

  "/top-students",

  teacherAuth,

  getTopStudents

);








// GET /api/teacher/subject-analysis

router.get(

  "/subject-analysis",

  teacherAuth,

  getSubjectAnalysis

);







export default router;