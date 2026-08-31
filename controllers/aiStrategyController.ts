import { Request, Response } from "express";
import {
  generateStudyGuide,
  generateAIQuestions,
} from "../services/groqAIService";

// ============================================================
// GENERATE STUDY GUIDE
// ============================================================

export const createStudyGuide = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      subject,
      chapter,
      lesson,
    } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!chapter?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Chapter is required.",
      });
    }

    const studyGuide =
      await generateStudyGuide({
        subject: subject.trim(),
        chapter: chapter.trim(),
        lesson: lesson?.trim() || "",
      });

    return res.status(200).json({
      success: true,
      studyGuide,
    });
  } catch (error: any) {
    console.error(
      "AI Study Guide Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to generate study guide.",
    });
  }
};

// ============================================================
// GENERATE QUESTIONS
// ============================================================

export const createAIQuestions = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      subject,
      chapter,
      lesson,
      difficulty,
      count,
      studyGuide,
    } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!chapter?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Chapter is required.",
      });
    }

    if (!studyGuide) {
      return res.status(400).json({
        success: false,
        message: "Study guide is required.",
      });
    }

    const allowedDifficulty = [
      "Easy",
      "Medium",
      "Hard",
    ];

    if (
      !allowedDifficulty.includes(
        difficulty
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Difficulty must be Easy, Medium or Hard.",
      });
    }

    const questions =
      await generateAIQuestions({
        subject: subject.trim(),
        chapter: chapter.trim(),
        lesson: lesson?.trim() || "",
        difficulty,
        count: Number(count) || 10,
        studyGuide,
      });

    return res.status(200).json({
      success: true,
      questions,
    });
  } catch (error: any) {
    console.error(
      "AI Question Generation Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to generate AI questions.",
    });
  }
};