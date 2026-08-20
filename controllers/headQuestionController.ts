import { Request, Response } from "express";
import QuestionBank from "../models/questionModel";

export const updateQuestionByHead = async (
  req: Request,
  res: Response
) => {
  try {
    const { questionId } = req.params;

    const {
      question,
      options,
      correctAnswer,
      ansNumber,
      explanation,
      chapter,
      subject,
    } = req.body;

    const existingQuestion =
      await QuestionBank.findById(questionId);

    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    if (
      options &&
      (!Array.isArray(options) ||
        options.length !== 4)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Exactly 4 options are required",
      });
    }

    // HEAD ONLY
    if (question !== undefined) {
      existingQuestion.question = question;
    }

    if (options !== undefined) {
      existingQuestion.options = options;
    }

    if (correctAnswer !== undefined) {
      existingQuestion.correctAnswer =
        correctAnswer;
    }

    if (ansNumber !== undefined) {
      existingQuestion.ansNumber = ansNumber;
    }

    // Fixed: changed .explanation to .aiExplanation
    if (explanation !== undefined) {
      existingQuestion.aiExplanation =
        explanation;
    }

    if (chapter !== undefined) {
      existingQuestion.chapter = chapter;
    }

    if (subject !== undefined) {
      existingQuestion.subject =
        subject.toLowerCase();
    }

    await existingQuestion.save();

    return res.status(200).json({
      success: true,
      message:
        "Question updated successfully by Head",
      data: existingQuestion,
    });
  } catch (error) {
    console.error(
      "HEAD UPDATE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update question",
    });
  }
};