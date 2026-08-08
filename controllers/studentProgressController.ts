import { Request, Response } from "express";
import StudentProgress from "../models/StudentProgress";

// CREATE
export const createProgress = async (
  req: Request,
  res: Response
) => {
  try {

    const progress = await StudentProgress.create(req.body);

    res.status(201).json({
      success: true,
      progress,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Unable to create progress",
    });

  }
};

// GET STUDENT PROGRESS
export const getStudentProgress = async (
  req: Request,
  res: Response
) => {

  try {

    const progress = await StudentProgress.find({
      studentId: req.params.studentId,
    });

    res.json({
      success: true,
      progress,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
    });

  }
};

// UPDATE
export const updateProgress = async (
  req: Request,
  res: Response
) => {

  try {

    const progress =
      await StudentProgress.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );

    res.json({
      success: true,
      progress,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
    });

  }
};