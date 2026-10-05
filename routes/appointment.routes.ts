import { Router } from "express";

import {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
} from "../controllers/appointment.controller";

const router = Router();

// ============================================================
// USER - BOOK APPOINTMENT
// POST /api/appointments
// ============================================================

router.post(
  "/",
  createAppointment,
);

// ============================================================
// USER - GET MY APPOINTMENTS
// GET /api/appointments/my?mobile=9876543210
// ============================================================

router.get(
  "/my",
  getMyAppointments,
);

// ============================================================
// USER - CANCEL APPOINTMENT
// POST /api/appointments/:bookingId/cancel
// ============================================================

router.post(
  "/:bookingId/cancel",
  cancelAppointment,
);

export default router;