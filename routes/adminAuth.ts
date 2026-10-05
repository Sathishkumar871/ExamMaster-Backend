import { Router } from "express";
import {
  adminLogin,
  adminLogout,
} from "../controllers/adminAuthController";
import { portalAuth } from "../middleware/portalAuth";

const router = Router();

router.post(
  "/login",
  adminLogin,
);

router.post(
  "/logout",
  portalAuth,
  adminLogout,
);

export default router;