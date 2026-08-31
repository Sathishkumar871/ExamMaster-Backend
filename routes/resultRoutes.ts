import express from "express";


import {

  submitExam

} from "../controllers/resultSubmitController";



import {

  getStudentResults,

  getSingleResult,

  getLatestResult,

  getTopResults,

  getSubjectResults,
  getStudentPerformanceAnalytics

} from "../controllers/resultController";



const router = express.Router();




// SUBMIT EXAM RESULT

router.post(

  "/submit",

  submitExam

);




// STUDENT RESULT HISTORY

router.get(

  "/student/:studentId",

  getStudentResults

);




// LATEST RESULT

router.get(

  "/latest/:studentId",

  getLatestResult

);




// TOP RESULTS

router.get(

  "/top",

  getTopResults

);




// SUBJECT RESULTS

router.get(

  "/subject/:subject",

  getSubjectResults

);
// PERFORMANCE ANALYTICS ROUTE
router.get(
  "/performance/:studentId",
  getStudentPerformanceAnalytics
);




// SINGLE RESULT

router.get(

  "/:id",

  getSingleResult

);



export default router;