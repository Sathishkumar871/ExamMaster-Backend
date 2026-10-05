import { Router } from "express";

import {
  createHeroSlide,
  deleteHeroSlide,
  getAllHeroSlides,
  getHeroSlideById,
  getHeroSlides,
  toggleHeroSlide,
  updateHeroSlide,
  updateHeroSlideOrder,
} from "../controllers/homeHeroController";

import { portalAuth } from "../middleware/portalAuth";

const router = Router();

/* =========================================================
   PUBLIC
   Flutter Home Page
========================================================= */

router.get("/", getHeroSlides);

/* =========================================================
   ADMIN
========================================================= */

// Get all hero slides
router.get(
  "/admin",
  portalAuth,
  getAllHeroSlides
);

// Get single hero slide
router.get(
  "/admin/:id",
  portalAuth,
  getHeroSlideById
);

// Create hero slide
router.post(
  "/",
  portalAuth,
  createHeroSlide
);

// Update hero slide
router.put(
  "/:id",
  portalAuth,
  updateHeroSlide
);

// Toggle active / inactive
router.patch(
  "/:id/toggle",
  portalAuth,
  toggleHeroSlide
);

// Update display order
router.patch(
  "/:id/order",
  portalAuth,
  updateHeroSlideOrder
);

// Delete hero slide
router.delete(
  "/:id",
  portalAuth,
  deleteHeroSlide
);

export default router;