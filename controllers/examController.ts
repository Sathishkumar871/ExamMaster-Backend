import { Request, Response } from "express";

import Exam from "../models/examModel";
import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";

// ============================================================
// TYPES
// ============================================================

type ExamType = "NEET" | "JEE";

const normalizeExamType = (
  value: any
): ExamType => {
  return String(value || "")
    .trim()
    .toUpperCase() === "JEE"
    ? "JEE"
    : "NEET";
};

// ============================================================
// GET HEAD / TEACHER ID
// ============================================================

const getTeacherId = (req: any): string => {
  return (
    req.user?.id ||
    req.user?._id ||
    req.head?.headId ||
    req.head?._id ||
    req.body?.teacherId ||
    "HEAD"
  );
};

// ============================================================
// CREATE MOCK EXAM
// ============================================================

export const createExam = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      title,
      examName,
      subject,
      chapter,
      className,
      questions,
      duration,
      teacherId,
      examType,
      marksPerQuestion,
      negativeMarks,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !title ||
      !subject ||
      !className ||
      !teacherId ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, Subject, ClassName, TeacherId and Questions are required",
      });
    }

    // ========================================================
    // SUBJECT
    // ========================================================

    const normalizedSubject =
      String(subject).trim();

    const allowedSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Botany",
      "Zoology",
      "Mathematics",
    ];

    if (
      !allowedSubjects.includes(
        normalizedSubject
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subject",
      });
    }

    // ========================================================
    // EXAM TYPE
    // ========================================================

    const normalizedExamType =
      normalizeExamType(examType);

    // ========================================================
    // MARKING
    // ========================================================

    const normalizedMarksPerQuestion =
      Number(marksPerQuestion) || 4;

    const normalizedNegativeMarks =
      Number(negativeMarks) || 1;

    // ========================================================
    // CREATE MOCK EXAM
    // ========================================================

    const exam = await Exam.create({
      title: String(title).trim(),

      examName:
        String(
          examName || title
        ).trim(),

      subject:
        normalizedSubject,

      chapter:
        String(chapter || "").trim(),

      className:
        String(className).trim(),

      // IMPORTANT
      // This controller creates ONLY MOCK tests.
      testCategory: "mock",

      // NEET / JEE
      examType:
        normalizedExamType,

      targetExam:
        normalizedExamType,

      questions,

      totalQuestions:
        questions.length,

      duration:
        Number(duration) || 180,

      marksPerQuestion:
        normalizedMarksPerQuestion,

      negativeMarks:
        normalizedNegativeMarks,

      createdBy:
        teacherId,

      status:
        "draft",

      isPublished:
        false,
    });

    return res.status(201).json({
      success: true,

      message:
        `${normalizedExamType} mock test created successfully`,

      exam,
    });
  } catch (error: any) {
    console.error(
      "CREATE MOCK EXAM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create mock exam",
    });
  }
};

// ============================================================
// GET TEACHER MOCK EXAMS
// ============================================================

export const getTeacherExams = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      teacherId,
      examType,
      subject,
    } = req.query;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message:
          "TeacherId required",
      });
    }

    const filter: any = {
      createdBy:
        String(teacherId),

      // ONLY MOCK
      testCategory:
        "mock",
    };

    // ========================================================
    // SUBJECT
    // ========================================================

    if (
      subject &&
      String(subject) !== "All"
    ) {
      filter.subject =
        String(subject);
    }

    // ========================================================
    // NEET / JEE
    // ========================================================

    if (
      examType &&
      String(examType) !== "All"
    ) {
      filter.examType =
        normalizeExamType(
          examType
        );
    }

    const exams =
      await Exam.find(filter)
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      total: exams.length,
      exams,
    });
  } catch (error: any) {
    console.error(
      "GET MOCK EXAMS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get mock exams",
    });
  }
};

// ============================================================
// GET PUBLISHED MOCK TESTS
// ============================================================

export const getPublishedMockExams = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      examType,
      subject,
    } = req.query;

    const filter: any = {
      testCategory:
        "mock",

      status:
        "published",

      isPublished:
        true,
    };

    // ========================================================
    // NEET / JEE
    // ========================================================

    if (
      examType &&
      String(examType) !== "All"
    ) {
      filter.examType =
        normalizeExamType(
          examType
        );
    }

    // ========================================================
    // SUBJECT
    // ========================================================

    if (
      subject &&
      String(subject) !== "All"
    ) {
      filter.subject =
        String(subject);
    }

    const exams =
      await Exam.find(filter)
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      total: exams.length,
      exams,
    });
  } catch (error: any) {
    console.error(
      "GET PUBLISHED MOCK EXAMS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get published mock exams",
    });
  }
};

// ============================================================
// PUBLISH MOCK EXAM
// ============================================================

export const publishExam = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const exam =
      await Exam.findOneAndUpdate(
        {
          _id:
            req.params.id,

          // ONLY MOCK
          testCategory:
            "mock",
        },
        {
          status:
            "published",

          isPublished:
            true,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Mock exam not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Mock exam published successfully",
      exam,
    });
  } catch (error: any) {
    console.error(
      "PUBLISH MOCK EXAM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to publish mock exam",
    });
  }
};

// ============================================================
// START MOCK TEST
// ============================================================

export const startExam = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      studentId,
      examId,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !studentId ||
      !examId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "StudentId and ExamId required",
      });
    }

    // ========================================================
    // FIND MOCK EXAM
    // ========================================================

    const exam =
      await Exam.findOne({
        _id: examId,

        // ONLY MOCK
        testCategory:
          "mock",

        status:
          "published",

        isPublished:
          true,
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Published mock exam not found",
      });
    }

    // ========================================================
    // FIND QUESTIONS
    // ========================================================

    const questions =
      await QuestionBank.find({
        _id: {
          $in:
            exam.questions,
        },

        isPublished:
          true,

        testCategory:
          "mock",

        examType:
          exam.examType,
      })
        .sort({
          questionNumber: 1,
        });

    if (
      questions.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          `No published ${exam.examType} mock questions found`,
      });
    }

    // ========================================================
    // CREATE SESSION
    // ========================================================

    const session =
      await ExamSession.create({
        studentId,

        examId,

        questions:
          questions.map(
            (q: any) =>
              q._id
          ),

        answers: [],

        score: 0,

        status:
          "started",

        startTime:
          new Date(),
      });

    // ========================================================
    // DISPLAY QUESTIONS
    // ========================================================

    const displayQuestions =
      questions.map(
        (q: any) => ({
          questionId:
            q._id,

          questionNumber:
            q.questionNumber,

          question:
            q.question,

          options:
            Array.isArray(
              q.options
            )
              ? q.options
              : [],

          subject:
            q.subject,

          chapter:
            q.chapter,

          imageUrl:
            q.imageUrl || "",
        })
      );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message:
        `${exam.examType} mock test started`,

      sessionId:
        session._id,

      exam: {
        id:
          exam._id,

        title:
          exam.title,

        examName:
          exam.examName,

        testCategory:
          "mock",

        examType:
          exam.examType,

        subject:
          exam.subject,

        chapter:
          exam.chapter,

        className:
          exam.className,

        duration:
          exam.duration,

        totalQuestions:
          questions.length,

        marksPerQuestion:
          exam.marksPerQuestion,

        negativeMarks:
          exam.negativeMarks,
      },

      questions:
        displayQuestions,
    });
  } catch (error: any) {
    console.error(
      "START MOCK TEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to start mock test",
    });
  }
};

// ============================================================
// SUBMIT MOCK TEST
// ============================================================

export const submitExam = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      studentId,
      studentName,
      sessionId,
      answers,
      warnings,
      timeTaken,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !studentId ||
      !sessionId ||
      !Array.isArray(answers)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "StudentId, SessionId and Answers required",
      });
    }

    // ========================================================
    // FIND SESSION
    // ========================================================

    const session =
      await ExamSession.findById(
        sessionId
      );

    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Mock exam session not found",
      });
    }

    // ========================================================
    // SESSION OWNER
    // ========================================================

    if (
      String(
        session.studentId
      ) !==
      String(studentId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This exam session does not belong to this student",
      });
    }

    // ========================================================
    // DOUBLE SUBMISSION
    // ========================================================

    if (
      session.status ===
      "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mock test already submitted",
      });
    }

    // ========================================================
    // FIND EXAM
    // ========================================================

    const exam =
      await Exam.findById(
        session.examId
      );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Mock exam not found",
      });
    }

    // Safety check
    if (
      exam.testCategory !==
      "mock"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This controller accepts mock tests only",
      });
    }

    // ========================================================
    // MARKING CONFIG
    // ========================================================

    const marksPerQuestion =
      Number(
        exam.marksPerQuestion
      ) || 4;

    const negativeMarks =
      Number(
        exam.negativeMarks
      ) || 1;

    // ========================================================
    // COUNTERS
    // ========================================================

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let attemptedQuestions = 0;

    let unansweredQuestions = 0;

    let marks = 0;

    const review: any[] = [];

    // ========================================================
    // ANSWER MAP
    // ========================================================

    const answerMap =
      new Map<string, string>();

    for (
      const item of answers
    ) {
      if (
        item?.questionId
      ) {
        answerMap.set(
          String(
            item.questionId
          ),
          String(
            item.answer || ""
          ).trim()
        );
      }
    }

    // ========================================================
    // CHECK QUESTIONS
    // ========================================================

    for (
      const questionId of
        session.questions
    ) {
      const question =
        await QuestionBank.findById(
          questionId
        );

      if (!question) {
        continue;
      }

      const selectedAnswer =
        answerMap.get(
          String(
            question._id
          )
        ) || "";

      const cleanSelected =
        selectedAnswer.trim();

      const cleanCorrect =
        String(
          question.correctAnswer ||
            ""
        ).trim();

      // ======================================================
      // UNANSWERED
      // ======================================================

      if (
        cleanSelected === ""
      ) {
        unansweredQuestions++;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer:
            "",

          correctAnswer:
            question.correctAnswer,

          isCorrect:
            false,

          marks:
            0,

          result:
            "unanswered",
        });

        continue;
      }

      // ======================================================
      // ATTEMPTED
      // ======================================================

      attemptedQuestions++;

      const isCorrect =
        cleanSelected ===
        cleanCorrect;

      // ======================================================
      // CORRECT
      // ======================================================

      if (isCorrect) {
        correctAnswers++;

        marks +=
          marksPerQuestion;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer:
            cleanSelected,

          correctAnswer:
            question.correctAnswer,

          isCorrect:
            true,

          marks:
            marksPerQuestion,

          result:
            "correct",
        });
      }

      // ======================================================
      // WRONG
      // ======================================================

      else {
        wrongAnswers++;

        marks -=
          negativeMarks;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer:
            cleanSelected,

          correctAnswer:
            question.correctAnswer,

          isCorrect:
            false,

          marks:
            -negativeMarks,

          result:
            "wrong",
        });
      }
    }

    // ========================================================
    // TOTAL QUESTIONS
    // ========================================================

    const totalQuestions =
      session.questions.length;

    // ========================================================
    // MAX MARKS
    // ========================================================

    const maxMarks =
      totalQuestions *
      marksPerQuestion;

    // ========================================================
    // FINAL MARKS
    // ========================================================

    // Do not allow negative total score.
    const finalMarks =
      Math.max(0, marks);

    // ========================================================
    // PERCENTAGE
    // ========================================================

    const percentage =
      maxMarks > 0
        ? Number(
            (
              (finalMarks /
                maxMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    // ========================================================
    // GRADE
    // ========================================================

    let grade =
      "F";

    if (
      percentage >= 90
    ) {
      grade = "A+";
    } else if (
      percentage >= 80
    ) {
      grade = "A";
    } else if (
      percentage >= 70
    ) {
      grade = "B";
    } else if (
      percentage >= 60
    ) {
      grade = "C";
    } else if (
      percentage >= 50
    ) {
      grade = "D";
    }

    // ========================================================
    // PASS / FAIL
    // ========================================================

    const status =
      percentage >= 40
        ? "PASS"
        : "FAIL";

    // ========================================================
    // NEXT DAY 9:00 AM
    // ========================================================

    const resultAvailableAt =
      new Date();

    resultAvailableAt.setDate(
      resultAvailableAt.getDate() +
        1
    );

    resultAvailableAt.setHours(
      9,
      0,
      0,
      0
    );

    // ========================================================
    // CREATE RESULT
    // ========================================================

    const result =
      await Result.create({
        studentId,

        studentName:
          studentName || "",

        examId:
          session.examId,

        examName:
          exam.title ||
          "Mock Test",

        testCategory:
          "mock",

        subject:
          exam.subject ||
          "General",

        examType:
          exam.examType,

        totalQuestions,

        attemptedQuestions,

        unansweredQuestions,

        correctAnswers,

        wrongAnswers,

        marks:
          finalMarks,

        maxMarks,

        marksPerQuestion,

        negativeMarks,

        percentage,

        grade,

        status,

        timeTaken:
          Number(timeTaken) || 0,

        warnings:
          Number(warnings) || 0,

        rank:
          0,

        resultAvailableAt,

        // IMPORTANT
        // Result hidden until next day 9 AM.
        isResultPublished:
          false,

        review,
      });

    // ========================================================
    // COMPLETE SESSION
    // ========================================================

    session.answers =
      answers.map(
        (item: any) => ({
          questionId:
            String(
              item.questionId
            ),

          answer:
            String(
              item.answer || ""
            ),
        })
      );

    session.score =
      finalMarks;

    session.status =
      "completed";

    session.endTime =
      new Date();

    await session.save();

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message:
        "Mock test submitted successfully. Result will be available tomorrow at 9:00 AM.",

      result: {
        id:
          result._id,

        examId:
          result.examId,

        examName:
          result.examName,

        testCategory:
          "mock",

        examType:
          result.examType,

        subject:
          result.subject,

        totalQuestions:
          result.totalQuestions,

        attemptedQuestions:
          result.attemptedQuestions,

        unansweredQuestions:
          result.unansweredQuestions,

        correctAnswers:
          result.correctAnswers,

        wrongAnswers:
          result.wrongAnswers,

        marks:
          result.marks,

        maxMarks:
          result.maxMarks,

        marksPerQuestion:
          result.marksPerQuestion,

        negativeMarks:
          result.negativeMarks,

        percentage:
          result.percentage,

        grade:
          result.grade,

        status:
          result.status,

        timeTaken:
          result.timeTaken,

        warnings:
          result.warnings,

        resultAvailableAt:
          result.resultAvailableAt,

        isResultPublished:
          false,
      },
    });
  } catch (error: any) {
    console.error(
      "SUBMIT MOCK TEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to submit mock test",
    });
  }
};

// ============================================================
// GET SINGLE MOCK EXAM
// ============================================================

export const getExamById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const exam =
      await Exam.findOne({
        _id:
          req.params.id,

        testCategory:
          "mock",
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Mock exam not found",
      });
    }

    return res.status(200).json({
      success: true,
      exam,
    });
  } catch (error: any) {
    console.error(
      "GET MOCK EXAM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get mock exam",
    });
  }
};

// ============================================================
// DELETE MOCK EXAM
// ============================================================

export const deleteExam = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const exam =
      await Exam.findOneAndDelete({
        _id:
          req.params.id,

        testCategory:
          "mock",
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Mock exam not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Mock exam deleted successfully",
    });
  } catch (error: any) {
    console.error(
      "DELETE MOCK EXAM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete mock exam",
    });
  }
};

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  createExam,
  getTeacherExams,
  getPublishedMockExams,
  getExamById,
  publishExam,
  startExam,
  submitExam,
  deleteExam,
};