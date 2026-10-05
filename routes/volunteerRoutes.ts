
import { Router } from "express";

import {
  volunteerLogin,
  getMyVillageUsers,
} from "../controllers/volunteerController";

import volunteerAuth from "../middleware/volunteerAuth";

const router = Router();

/* =========================================================
   VOLUNTEER LOGIN
========================================================= */

router.post(
  "/login",
  volunteerLogin,
);

/* =========================================================
   PROTECTED VOLUNTEER ROUTES
   Login required for all routes below
========================================================= */

router.use(volunteerAuth);

/* =========================================================
   GET MY VILLAGE USERS

   Volunteer can see users from the exact village assigned
   to the authenticated volunteer.

   GET:
   /api/volunteers/village/users
========================================================= */

router.get(
  "/village/users",
  getMyVillageUsers,
);

export default router;

