import express from "express";


import {

  getMentorDashboard,

  getStudentHistory,

  addMentorWeeklyFeedback

} from "../controllers/mentorController";


import staffAuth from "../middleware/staffAuth";



const router = express.Router();





// ======================================
// MENTOR DASHBOARD
// GET /api/mentor/dashboard
// ======================================

router.get(

"/dashboard",

staffAuth,

getMentorDashboard

);









// ======================================
// STUDENT PROGRESS CARD
// GET /api/mentor/student/:studentId
// ======================================

router.get(

"/student/:studentId",

staffAuth,

getStudentHistory

);









// ======================================
// ADD / UPDATE STUDENT PROGRESS
// PUT /api/mentor/weekly-feedback
// ======================================

router.put(

"/weekly-feedback",

staffAuth,

addMentorWeeklyFeedback

);








export default router;