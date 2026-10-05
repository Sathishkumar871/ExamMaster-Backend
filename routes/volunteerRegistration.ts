import { Router } from "express";

import {
  registerVolunteer,
} from "../controllers/volunteerRegistrationController";

const router = Router();

router.post(
  "/register",
  registerVolunteer,
);

export default router;