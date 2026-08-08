import express from "express";

import {
  getHeadDashboard,
  getPendingStaff,
  approveStaff,
  rejectStaff
} from "../controllers/headController";

import headAuth from "../middleware/headAuth";


const router = express.Router();



// ======================================
// HEAD DASHBOARD
// GET /api/head/dashboard
// ======================================

router.get(

  "/dashboard",

  headAuth,

  getHeadDashboard

);





// ======================================
// PENDING MENTOR + MANAGER REQUESTS
// GET /api/head/pending-staff
// ======================================

router.get(

  "/pending-staff",

  headAuth,

  getPendingStaff

);





// ======================================
// APPROVE MENTOR / MANAGER
// PUT /api/head/approve/:id
// ======================================

router.put(

  "/approve/:id",

  headAuth,

  approveStaff

);





// ======================================
// REJECT MENTOR / MANAGER
// DELETE /api/head/reject/:id
// ======================================

router.delete(

  "/reject/:id",

  headAuth,

  rejectStaff

);





export default router;