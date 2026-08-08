import { Router } from "express";

import {

  createExam,

  getTeacherExams,

  publishExam,

  startExam,

  submitExam

} from "../controllers/examController";


// Middleware optional
// import { teacherAuth } from "../middleware/teacherAuth";
// import { studentAuth } from "../middleware/studentAuth";


const router = Router();





// =====================================
// TEACHER CREATE EXAM
// =====================================


router.post(

  "/create",

  // teacherAuth,

  createExam

);







// =====================================
// TEACHER GET EXAMS
// =====================================


router.get(

  "/teacher",

  // teacherAuth,

  getTeacherExams

);








// =====================================
// TEACHER PUBLISH EXAM
// =====================================


router.put(

  "/publish/:id",

  // teacherAuth,

  publishExam

);








// =====================================
// STUDENT START EXAM
// =====================================


router.post(

  "/start",

  // studentAuth,

  startExam

);








// =====================================
// STUDENT SUBMIT EXAM
// =====================================


router.post(

  "/submit",

  // studentAuth,

  submitExam

);






export default router;