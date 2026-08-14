
import { Request, Response } from "express";

import Result from "../models/resultModel";
import DailyTest from "../models/DailyTest";


// ============================================================
// GET NEXT DAY 8:00 AM
// ============================================================

const getNextDay8AM = (): Date => {

  const now = new Date();

  const release = new Date(now);

  release.setDate(release.getDate() + 1);

  release.setHours(8, 0, 0, 0);

  return release;
};


// ============================================================
// CHECK RESULT AVAILABILITY
// ============================================================

const isResultAvailable = (
  result: any
): boolean => {

  if (result.testCategory !== "mock") {
    return true;
  }

  if (result.isResultPublished) {
    return true;
  }

  if (
    result.resultAvailableAt &&
    new Date() >=
      new Date(result.resultAvailableAt)
  ) {
    return true;
  }

  return false;
};


// ============================================================
// SUBMIT EXAM RESULT
// ============================================================

export const submitResult = async (
  req: Request,
  res: Response
) => {

  try {

    const {

      studentId,

      studentName,

      examId,

      answers,

      timeTaken,

      warnings,

      testCategory

    } = req.body;


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !studentId ||
      !examId ||
      !Array.isArray(answers)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "StudentId, ExamId and Answers required"

      });

    }


    // ========================================================
    // GET TEST
    // ========================================================

    const test =
      await DailyTest.findById(examId);


    if (!test) {

      return res.status(404).json({

        success: false,

        message: "Exam not found"

      });

    }


    // ========================================================
    // TEST CATEGORY
    // ========================================================

    const category:
      "mock" | "daily" | "subject" =
        testCategory === "mock"
          ? "mock"
          : testCategory === "daily"
          ? "daily"
          : "subject";


    // ========================================================
    // MARKING
    // ========================================================

    let correctAnswers = 0;

    let wrongAnswers = 0;

    const review: any[] = [];


    test.questions.forEach(

      (question: any, index: number) => {

        const selectedAnswer =
          answers[index] || "";


        const isAnswered =
          selectedAnswer.trim() !== "";


        const isCorrect =
          isAnswered &&
          selectedAnswer ===
            question.correctAnswer;


        if (isCorrect) {

          correctAnswers++;

        }

        else if (isAnswered) {

          wrongAnswers++;

        }


        review.push({

          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer,

          correctAnswer:
            question.correctAnswer,

          isCorrect,

          marks:
            isCorrect
              ? 4
              : isAnswered
              ? -1
              : 0

        });

      }

    );


    // ========================================================
    // QUESTION COUNTS
    // ========================================================

    const totalQuestions =
      test.questions.length;


    const attemptedQuestions =
      correctAnswers +
      wrongAnswers;


    const unansweredQuestions =
      totalQuestions -
      attemptedQuestions;


    // ========================================================
    // NEET MARKING
    // CORRECT = +4
    // WRONG   = -1
    // EMPTY   = 0
    // ========================================================

    const marks =
      (correctAnswers * 4) -
      wrongAnswers;


    // ========================================================
    // PERCENTAGE
    // ========================================================

    const maxMarks =
      totalQuestions * 4;


    const percentage =
      maxMarks > 0
        ? Number(

            (
              (marks / maxMarks) *
              100

            ).toFixed(2)

          )
        : 0;


    // ========================================================
    // GRADE
    // ========================================================

    let grade = "F";

    let status:
      "PASS" | "FAIL" = "FAIL";


    if (percentage >= 90) {

      grade = "A+";

      status = "PASS";

    }

    else if (percentage >= 75) {

      grade = "A";

      status = "PASS";

    }

    else if (percentage >= 60) {

      grade = "B";

      status = "PASS";

    }

    else if (percentage >= 50) {

      grade = "C";

      status = "PASS";

    }

    else if (percentage >= 40) {

      grade = "D";

      status = "PASS";

    }


    // ========================================================
    // RESULT RELEASE
    //
    // DAILY   -> IMMEDIATE
    // SUBJECT -> IMMEDIATE
    // MOCK    -> NEXT DAY 8 AM
    // ========================================================

    let resultAvailableAt: Date;

    let isResultPublished: boolean;


    if (category === "mock") {

      resultAvailableAt =
        getNextDay8AM();

      isResultPublished = false;

    }

    else {

      resultAvailableAt =
        new Date();

      isResultPublished = true;

    }


    // ========================================================
    // CREATE RESULT
    // ========================================================

    const result =
      await Result.create({

        studentId,

        studentName:
          studentName || "",

        examId,

        examName:
          test.title,

        testCategory:
          category,

        subject:
          test.subject || "General",

        totalQuestions,

        attemptedQuestions,

        unansweredQuestions,

        correctAnswers,

        wrongAnswers,

        marks,

        percentage,

        grade,

        status,

        timeTaken:
          timeTaken || 0,

        warnings:
          warnings || 0,

        rank: 0,

        resultAvailableAt,

        isResultPublished,

        review

      });


    // ========================================================
    // RESPONSE
    //
    // MOCK -> DON'T SEND RESULT DETAILS
    // DAILY/SUBJECT -> SEND FULL RESULT
    // ========================================================

    if (category === "mock") {

      return res.status(201).json({

        success: true,

        message:
          "Mock test submitted successfully. Result will be available tomorrow at 8:00 AM.",

        result: {

          _id:
            result._id,

          examName:
            result.examName,

          testCategory:
            result.testCategory,

          subject:
            result.subject,

          totalQuestions,

          resultAvailableAt,

          isResultPublished: false,

          locked: true

        }

      });

    }


    // ========================================================
    // IMMEDIATE RESULT
    // ========================================================

    return res.status(201).json({

      success: true,

      message:
        "Exam Submitted Successfully",

      result

    });


  }

  catch (error: any) {

    console.error(
      "SUBMIT RESULT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to submit result"

    });

  }

};


// ============================================================
// GET ALL RESULTS OF STUDENT
// ============================================================

export const getStudentResults = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      studentId
    } = req.params;


    const results =
      await Result.find({

        studentId

      })
      .sort({

        createdAt: -1

      });


    const processedResults =
      results.map((result: any) => {

        const available =
          isResultAvailable(result);


        // ====================================================
        // IMMEDIATE RESULT
        // ====================================================

        if (available) {

          return {

            ...result.toObject(),

            locked: false,

            isResultPublished: true

          };

        }


        // ====================================================
        // LOCKED MOCK RESULT
        // ====================================================

        return {

          _id:
            result._id,

          studentId:
            result.studentId,

          studentName:
            result.studentName,

          examId:
            result.examId,

          examName:
            result.examName,

          testCategory:
            result.testCategory,

          subject:
            result.subject,

          totalQuestions:
            result.totalQuestions,

          resultAvailableAt:
            result.resultAvailableAt,

          isResultPublished: false,

          locked: true,

          message:
            "Result will be available tomorrow at 8:00 AM."

        };

      });


    return res.status(200).json({

      success: true,

      count:
        processedResults.length,

      results:
        processedResults

    });

  }

  catch (error: any) {

    console.error(
      "GET STUDENT RESULTS ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to fetch student results"

    });

  }

};


// ============================================================
// GET SINGLE RESULT
// ============================================================

export const getSingleResult = async (
  req: Request,
  res: Response
) => {

  try {

    const result =
      await Result.findById(
        req.params.id
      );


    if (!result) {

      return res.status(404).json({

        success: false,

        message:
          "Result not found"

      });

    }


    const available =
      isResultAvailable(result);


    // ========================================================
    // LOCKED MOCK
    // ========================================================

    if (!available) {

      return res.status(200).json({

        success: true,

        locked: true,

        message:
          "This mock test result is locked until tomorrow at 8:00 AM.",

        result: {

          _id:
            result._id,

          examName:
            result.examName,

          testCategory:
            result.testCategory,

          subject:
            result.subject,

          totalQuestions:
            result.totalQuestions,

          resultAvailableAt:
            result.resultAvailableAt,

          isResultPublished: false

        }

      });

    }


    // ========================================================
    // RESULT AVAILABLE
    // ========================================================

    // If release time reached, mark it published

    if (
      result.testCategory === "mock" &&
      !result.isResultPublished
    ) {

      result.isResultPublished = true;

      await result.save();

    }


    return res.json({

      success: true,

      locked: false,

      result

    });

  }

  catch (error: any) {

    console.error(
      "GET SINGLE RESULT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to fetch result"

    });

  }

};


// ============================================================
// GET LATEST RESULT
// ============================================================

export const getLatestResult = async (
  req: Request,
  res: Response
) => {

  try {

    const result =
      await Result.findOne({

        studentId:
          req.params.studentId

      })
      .sort({

        createdAt: -1

      });


    if (!result) {

      return res.status(404).json({

        success: false,

        message:
          "No Result Found"

      });

    }


    const available =
      isResultAvailable(result);


    // ========================================================
    // LOCKED MOCK
    // ========================================================

    if (!available) {

      return res.status(200).json({

        success: true,

        locked: true,

        result: {

          _id:
            result._id,

          examName:
            result.examName,

          testCategory:
            result.testCategory,

          subject:
            result.subject,

          totalQuestions:
            result.totalQuestions,

          resultAvailableAt:
            result.resultAvailableAt,

          isResultPublished: false

        }

      });

    }


    return res.json({

      success: true,

      locked: false,

      result

    });

  }

  catch (error: any) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// ============================================================
// TOP RESULTS
// ============================================================

export const getTopResults = async (
  req: Request,
  res: Response
) => {

  try {

    const results =
      await Result.find({

        isResultPublished: true

      })
      .sort({

        marks: -1,

        percentage: -1

      })
      .limit(20);


    return res.json({

      success: true,

      results

    });

  }

  catch (error: any) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};


// ============================================================
// SUBJECT RESULTS
// ============================================================

export const getSubjectResults = async (
  req: Request,
  res: Response
) => {

  try {

    const results =
      await Result.find({

        subject:
          req.params.subject,

        isResultPublished:
          true

      });


    return res.json({

      success: true,

      count:
        results.length,

      results

    });

  }

  catch (error: any) {

    return res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

};

