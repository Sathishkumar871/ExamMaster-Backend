import { Request, Response } from "express";

import {
  createHeroSlide as createHeroModel,
  deleteHeroSlide as deleteHeroModel,
  findActiveHeroSlides,
  findAllHeroSlides,
  findHeroSlideById,
  toggleHeroSlide as toggleHeroModel,
  updateHeroSlide as updateHeroModel,
  updateHeroSlideOrder as updateHeroOrderModel,
} from "../models/JanasevaHomeHero";

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNumber(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function cleanBoolean(
  value: unknown,
  fallback = true
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function getId(
  value: unknown
): number | null {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/* =========================================================
   GET ACTIVE HERO SLIDES
   PUBLIC
   GET /api/home/hero
========================================================= */

export async function getHeroSlides(
  _req: Request,
  res: Response
) {
  try {
    const heroSlides = await findActiveHeroSlides();

    return res.status(200).json({
      success: true,
      count: heroSlides.length,
      data: heroSlides,
    });
  } catch (error) {
    console.error(
      "GET HERO SLIDES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load hero slides.",
    });
  }
}

/* =========================================================
   GET ALL HERO SLIDES
   ADMIN
   GET /api/home/hero/admin
========================================================= */

export async function getAllHeroSlides(
  _req: Request,
  res: Response
) {
  try {
    const heroSlides = await findAllHeroSlides();

    return res.status(200).json({
      success: true,
      count: heroSlides.length,
      data: heroSlides,
    });
  } catch (error) {
    console.error(
      "GET ALL HERO SLIDES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load all hero slides.",
    });
  }
}

/* =========================================================
   GET ONE HERO SLIDE
   ADMIN
   GET /api/home/hero/admin/:id
========================================================= */

export async function getHeroSlideById(
  req: Request,
  res: Response
) {
  try {
    const id = getId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero slide ID.",
      });
    }

    const heroSlide =
      await findHeroSlideById(id);

    if (!heroSlide) {
      return res.status(404).json({
        success: false,
        message: "Hero slide not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: heroSlide,
    });
  } catch (error) {
    console.error(
      "GET HERO SLIDE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load hero slide.",
    });
  }
}

/* =========================================================
   CREATE HERO SLIDE
   ADMIN
   POST /api/home/hero
========================================================= */

export async function createHeroSlide(
  req: Request,
  res: Response
) {
  try {
    const {
      badge,
      title,
      description,
      imageUrl,
      icon,
      actionText,
      actionType,
      actionValue,
      isActive,
      displayOrder,
    } = req.body;

    const cleanTitle = cleanText(title);
    const cleanDescription =
      cleanText(description);

    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "Hero title is required.",
      });
    }

    if (!cleanDescription) {
      return res.status(400).json({
        success: false,
        message: "Hero description is required.",
      });
    }

    const heroSlide = await createHeroModel({
      badge: cleanText(badge),

      title: cleanTitle,

      description: cleanDescription,

      imageUrl: cleanText(imageUrl),

      icon:
        cleanText(icon) ||
        "people_alt_outlined",

      actionText: cleanText(actionText),

      actionType:
        cleanText(actionType) ||
        "info",

      actionValue:
        cleanText(actionValue),

      isActive:
        cleanBoolean(isActive, true),

      displayOrder:
        cleanNumber(displayOrder, 0),
    });

    return res.status(201).json({
      success: true,
      message: "Hero slide created successfully.",
      data: heroSlide,
    });
  } catch (error) {
    console.error(
      "CREATE HERO SLIDE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create hero slide.",
    });
  }
}

/* =========================================================
   UPDATE HERO SLIDE
   ADMIN
   PUT /api/home/hero/:id
========================================================= */

export async function updateHeroSlide(
  req: Request,
  res: Response
) {
  try {
    const id = getId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero slide ID.",
      });
    }

    const {
      badge,
      title,
      description,
      imageUrl,
      icon,
      actionText,
      actionType,
      actionValue,
      isActive,
      displayOrder,
    } = req.body;

    const existingHero =
      await findHeroSlideById(id);

    if (!existingHero) {
      return res.status(404).json({
        success: false,
        message: "Hero slide not found.",
      });
    }

    const finalTitle =
      title !== undefined
        ? cleanText(title)
        : existingHero.title;

    const finalDescription =
      description !== undefined
        ? cleanText(description)
        : existingHero.description;

    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: "Hero title is required.",
      });
    }

    if (!finalDescription) {
      return res.status(400).json({
        success: false,
        message: "Hero description is required.",
      });
    }

    const updatedHero =
      await updateHeroModel(id, {
        badge:
          badge !== undefined
            ? cleanText(badge)
            : existingHero.badge,

        title: finalTitle,

        description:
          finalDescription,

        imageUrl:
          imageUrl !== undefined
            ? cleanText(imageUrl)
            : existingHero.image_url,

        icon:
          icon !== undefined
            ? cleanText(icon) ||
              "people_alt_outlined"
            : existingHero.icon,

        actionText:
          actionText !== undefined
            ? cleanText(actionText)
            : existingHero.action_text,

        actionType:
          actionType !== undefined
            ? cleanText(actionType) ||
              "info"
            : existingHero.action_type,

        actionValue:
          actionValue !== undefined
            ? cleanText(actionValue)
            : existingHero.action_value,

        isActive:
          isActive !== undefined
            ? cleanBoolean(isActive)
            : existingHero.is_active,

        displayOrder:
          displayOrder !== undefined
            ? cleanNumber(
                displayOrder,
                existingHero.display_order
              )
            : existingHero.display_order,
      });

    if (!updatedHero) {
      return res.status(404).json({
        success: false,
        message: "Hero slide could not be updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero slide updated successfully.",
      data: updatedHero,
    });
  } catch (error) {
    console.error(
      "UPDATE HERO SLIDE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update hero slide.",
    });
  }
}

/* =========================================================
   TOGGLE HERO SLIDE
   ADMIN
   PATCH /api/home/hero/:id/toggle
========================================================= */

export async function toggleHeroSlide(
  req: Request,
  res: Response
) {
  try {
    const id = getId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero slide ID.",
      });
    }

    const heroSlide =
      await toggleHeroModel(id);

    if (!heroSlide) {
      return res.status(404).json({
        success: false,
        message: "Hero slide not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Hero slide visibility updated successfully.",
      data: heroSlide,
    });
  } catch (error) {
    console.error(
      "TOGGLE HERO SLIDE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update hero slide visibility.",
    });
  }
}

/* =========================================================
   UPDATE HERO SLIDE ORDER
   ADMIN
   PATCH /api/home/hero/:id/order
========================================================= */

export async function updateHeroSlideOrder(
  req: Request,
  res: Response
) {
  try {
    const id = getId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero slide ID.",
      });
    }

    const displayOrder =
      cleanNumber(
        req.body.displayOrder,
        0
      );

    const heroSlide =
      await updateHeroOrderModel(
        id,
        displayOrder
      );

    if (!heroSlide) {
      return res.status(404).json({
        success: false,
        message: "Hero slide not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Hero slide order updated successfully.",
      data: heroSlide,
    });
  } catch (error) {
    console.error(
      "UPDATE HERO SLIDE ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update hero slide order.",
    });
  }
}

/* =========================================================
   DELETE HERO SLIDE
   ADMIN
   DELETE /api/home/hero/:id
========================================================= */

export async function deleteHeroSlide(
  req: Request,
  res: Response
) {
  try {
    const id = getId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero slide ID.",
      });
    }

    const deleted =
      await deleteHeroModel(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Hero slide not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Hero slide deleted successfully.",
      id,
    });
  } catch (error) {
    console.error(
      "DELETE HERO SLIDE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete hero slide.",
    });
  }
}