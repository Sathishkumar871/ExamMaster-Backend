import { Router } from "express";

import {
  getJanasevaProfile,
  updateJanasevaProfile,
  deleteJanasevaAccount,
} from "../controllers/janasevaProfileController";

import { janasevaAuth } from "../middleware/janasevaAuth";

const router = Router();

// ============================================================================
// PROFILE
// ============================================================================

router.get(
  "/profile",
  janasevaAuth,
  getJanasevaProfile,
);

router.put(
  "/profile",
  janasevaAuth,
  updateJanasevaProfile,
);

router.delete(
  "/profile",
  janasevaAuth,
  deleteJanasevaAccount,
);

export default router;