import express from "express";

import {
  staffLogin,
  registerStaff
} from "../controllers/staffController";


const router = express.Router();


// ======================================
// STAFF ACCESS CODE LOGIN
// POST /api/staff/login
// ======================================

router.post(
  "/login",
  staffLogin
);



// ======================================
// STAFF REGISTER
// POST /api/staff/register
// ======================================

router.post(
  "/register",
  registerStaff
);



export default router;