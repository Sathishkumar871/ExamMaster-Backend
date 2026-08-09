import express from "express";

import {
  getDailyTests,
  startDailyTest,
  submitDailyTest,
} from "../controllers/dailyTestController";

const router = express.Router();

// GET published daily tests
router.get(
  "/",
  getDailyTests
);

// START daily test
router.post(
  "/start",
  startDailyTest
);

// SUBMIT daily test
router.post(
  "/submit",
  submitDailyTest
);

export default router;