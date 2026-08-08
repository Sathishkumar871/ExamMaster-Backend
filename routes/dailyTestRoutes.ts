import express from "express";
import { getDailyTests } from "../controllers/dailyTestController";
// import headAuth from "../middleware/headAuth"; // హెడ్ లేదా అడ్మిన్ ఆథెంటికేషన్ మిడిల్‌వేర్ అవసరమైతే ఇక్కడ ఇంపోర్ట్ చేయండి

const router = express.Router();

// =================================
// 1. GET ALL DAILY TESTS
// GET /api/daily-tests
// =================================
router.get("/", getDailyTests);

// ఒకవేళ హెడ్ ప్యానెల్ నుండి డైలీ టెస్ట్‌లను మేనేజ్ చేయడానికి (క్రియేట్/డిలీట్) రౌట్లు కావాలంటే ఇక్కడ యాడ్ చేసుకోవచ్చు:
// router.post("/create", headAuth, createDailyTest);
// router.delete("/delete/:id", headAuth, deleteDailyTest);

export default router;