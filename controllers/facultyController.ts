import { Request, Response } from "express";
import Faculty from "../models/Faculty";

/* =========================================================
   GET ALL FACULTY
========================================================= */

export const getFaculty = async (
  req: Request,
  res: Response
) => {
  try {
    const faculty = await Faculty.find({
      isActive: true,
    }).sort({
      role: 1,
      displayOrder: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: faculty.length,
      faculty,
    });
  } catch (error) {
    console.error("Get faculty error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty",
    });
  }
};

/* =========================================================
   GET SINGLE FACULTY
========================================================= */

export const getFacultyById = async (
  req: Request,
  res: Response
) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty member not found",
      });
    }

    res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    console.error("Get faculty member error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty member",
    });
  }
};

/* =========================================================
   CREATE FACULTY
========================================================= */

export const createFaculty = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      designation,
      role,
      department,
      subject,
      qualification,
      experience,
      image,
      email,
      phone,
      description,
      displayOrder,
      isActive,
    } = req.body;

    if (
      !name ||
      !designation ||
      !role ||
      !department ||
      !subject ||
      !qualification ||
      !experience ||
      !image ||
      !description
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required faculty details",
      });
    }

    const faculty = await Faculty.create({
      name,
      designation,
      role,
      department,
      subject,
      qualification,
      experience,
      image,
      email,
      phone,
      description,
      displayOrder: displayOrder ?? 0,
      isActive: isActive ?? true,
    });

    res.status(201).json({
      success: true,
      message: "Faculty member created successfully",
      faculty,
    });
  } catch (error) {
    console.error("Create faculty error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create faculty member",
    });
  }
};

/* =========================================================
   UPDATE FACULTY
========================================================= */

export const updateFaculty = async (
  req: Request,
  res: Response
) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Faculty updated successfully",
      faculty,
    });
  } catch (error) {
    console.error("Update faculty error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update faculty member",
    });
  }
};

/* =========================================================
   DELETE FACULTY
========================================================= */

export const deleteFaculty = async (
  req: Request,
  res: Response
) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(
      req.params.id
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Faculty member deleted successfully",
    });
  } catch (error) {
    console.error("Delete faculty error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete faculty member",
    });
  }
};