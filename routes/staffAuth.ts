import { Router } from "express";

import {
  staffLogin,
  staffLogout,
} from "../controllers/staffAuthController";

import { portalAuth } from "../middleware/portalAuth";

const router = Router();

router.post(
  "/login",
  staffLogin,
);

router.post(
  "/logout",
  portalAuth,
  staffLogout,
);

export default router;