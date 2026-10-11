import { Router } from "express";
import { listPublicMedia } from "../controllers/staffMediaController";

const router = Router();

// Public app endpoint: only records with isPublished=true are returned.
router.get("/public", listPublicMedia);

export default router;
