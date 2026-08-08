import express from "express";

import {

  createQuestion,

  getQuestions,

  getSubjectQuestions,

  updateQuestion,

  deleteQuestion

}
from "../controllers/questionBankController";


import teacherAuth from "../middleware/teacherAuth";


const router = express.Router();




// =====================================
// CREATE QUESTION
// Teacher Only
// POST /api/question-bank
// =====================================

router.post(

  "/",

  teacherAuth,

  createQuestion

);








// =====================================
// GET ALL QUESTIONS
// Teacher Only
// GET /api/question-bank
// =====================================

router.get(

  "/",

  teacherAuth,

  getQuestions

);








// =====================================
// GET SUBJECT QUESTIONS
// Teacher Only
// GET /api/question-bank/:subject
// =====================================

router.get(

  "/:subject",

  teacherAuth,

  getSubjectQuestions

);








// =====================================
// UPDATE QUESTION
// Teacher Only
// PUT /api/question-bank/:id
// =====================================

router.put(

  "/:id",

  teacherAuth,

  updateQuestion

);








// =====================================
// DELETE QUESTION
// Teacher Only
// DELETE /api/question-bank/:id
// =====================================

router.delete(

  "/:id",

  teacherAuth,

  deleteQuestion

);







export default router;