import express from "express";

import {
  getManagerDepartmentData,
  addManagerFeedback
} from "../controllers/managerController";

import managerAuth from "../middleware/managerAuth";


const router = express.Router();



// ======================================
// GET MANAGER DASHBOARD DATA
// GET /api/manager/data
// ======================================

router.get(

  "/data",

  managerAuth,

  getManagerDepartmentData

);




// ======================================
// MANAGER UPDATE DEPARTMENT FEEDBACK
// POST /api/manager/feedback
// ======================================

router.post(

  "/feedback",

  managerAuth,

  addManagerFeedback

);



export default router;