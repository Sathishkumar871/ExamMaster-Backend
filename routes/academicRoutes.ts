import { Router } from "express";
import { askAcademicAI } from "../controllers/academicController";

const router = Router();

router.post("/ask", askAcademicAI);

export default router;