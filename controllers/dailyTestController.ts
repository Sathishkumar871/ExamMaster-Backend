import { Request, Response } from "express";
import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";

// ============================================================
// ESCAPE REGEX
// ============================================================
const escapeRegex = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// ============================================================
// GET DAILY TESTS
// GET /api/daily-tests
// ============================================================
export const getDailyTests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { subject, chapter } = req.query;

    const filter: any = {
      testType: "daily",
      isPublished: true,
    };

    if (
      subject &&
      subject !== "All" &&
      subject !== "undefined"
    ) {
      filter.subject = {
        $regex: new RegExp(
          `^${escapeRegex(String(subject).trim())}$`,
          "i"
        ),
      };
    }

    if (
      chapter &&
      chapter !== "All" &&
      chapter !== "undefined"
    ) {
      filter.chapter = {
        $regex: new RegExp(
          `^${escapeRegex(String(chapter).trim())}$`,
          "i"
        ),
      };
    }

    const tests = await QuestionBank.find(filter).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      total: tests.length,
      tests,
    });
  } catch (error: any) {
    console.error(
      "GET DAILY TESTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch daily tests",
    });
  }
};

// ============================================================
// START DAILY TEST
// POST /api/daily-tests/start
// ============================================================
export const startDailyTest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      studentName,
      testTitle,
    } = req.body;

    if (!studentId) {
      res.status(400).json({
        success: false,
        message: "StudentId required",
      });
      return;
    }

    // --------------------------------------------------------
    // GET PUBLISHED DAILY QUESTIONS
    // --------------------------------------------------------
    const filter: any = {
      testType: "daily",
      isPublished: true,
    };

    if (testTitle) {
      filter.testTitle = testTitle;
    }

    const questions =
      await QuestionBank.find(filter).sort({
        createdAt: -1,
      });

    if (!questions.length) {
      res.status(404).json({
        success: false,
        message:
          "No published daily test questions found",
      });
      return;
    }

    // --------------------------------------------------------
    // CREATE EXAM SESSION
    // --------------------------------------------------------
    const session =
      await ExamSession.create({
        studentId,

        examId: null,

        questions: questions.map(
          (q: any) => q._id
        ),

        answers: [],

        score: 0,

        status: "started",

        startTime: new Date(),
      });

    // --------------------------------------------------------
    // SEND QUESTIONS
    // NEVER SEND correctAnswer
    // --------------------------------------------------------
    const displayQuestions =
      questions.map((q: any) => ({
        questionId: q._id,

        questionNumber:
          q.questionNumber,

        question:
          q.question,

        options:
          [...q.options].sort(
            () => Math.random() - 0.5
          ),

        subject:
          q.subject,

        chapter:
          q.chapter,

        imageUrl:
          q.imageUrl || "",
      }));

    // --------------------------------------------------------
    // DURATION
    // 1 MINUTE / QUESTION
    // MINIMUM 5 MINUTES
    // --------------------------------------------------------
    const duration =
      Math.max(
        questions.length * 60,
        300
      );

    res.status(200).json({
      success: true,

      message:
        "Daily test started successfully",

      sessionId:
        session._id,

      studentId,

      studentName:
        studentName || "",

      testTitle:
        testTitle ||
        questions[0]?.testTitle ||
        "Daily Practice Assessment",

      duration,

      totalQuestions:
        questions.length,

      questions:
        displayQuestions,
    });
  } catch (error: any) {
    console.error(
      "START DAILY TEST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to start daily test",
    });
  }
};

// ============================================================
// SUBMIT DAILY TEST
// POST /api/daily-tests/submit
//
// NEET STYLE MARKING:
// Correct   = +4
// Wrong     = -1
// Unanswered = 0
// ============================================================
export const submitDailyTest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      studentName,
      sessionId,
      answers,
      timeTaken,
      warnings,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------
    if (
      !studentId ||
      !sessionId ||
      !Array.isArray(answers)
    ) {
      res.status(400).json({
        success: false,
        message:
          "StudentId, SessionId and Answers required",
      });
      return;
    }

    // --------------------------------------------------------
    // FIND SESSION
    // --------------------------------------------------------
    const session =
      await ExamSession.findById(
        sessionId
      );

    if (!session) {
      res.status(404).json({
        success: false,
        message:
          "Daily test session not found",
      });
      return;
    }

    // --------------------------------------------------------
    // STUDENT SESSION CHECK
    // --------------------------------------------------------
    if (
      String(session.studentId) !==
      String(studentId)
    ) {
      res.status(403).json({
        success: false,
        message:
          "This exam session does not belong to this student",
      });
      return;
    }

    // --------------------------------------------------------
    // PREVENT DOUBLE SUBMISSION
    // --------------------------------------------------------
    if (
      session.status === "completed"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Daily test already submitted",
      });
      return;
    }

    // --------------------------------------------------------
    // GET QUESTIONS FROM SESSION
    // --------------------------------------------------------
    const questionIds =
      session.questions || [];

    const questions =
      await QuestionBank.find({
        _id: {
          $in: questionIds,
        },
      });

    if (!questions.length) {
      res.status(404).json({
        success: false,
        message:
          "Questions not found",
      });
      return;
    }

    // --------------------------------------------------------
    // MARKING
    // --------------------------------------------------------
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let attemptedQuestions = 0;
    let unansweredQuestions = 0;

    const review: any[] = [];

    // --------------------------------------------------------
    // CHECK EVERY QUESTION
    // --------------------------------------------------------
    for (const question of questions) {
      const submitted =
        answers.find(
          (item: any) =>
            String(item.questionId) ===
            String(question._id)
        );

      const selectedAnswer =
        submitted?.answer || "";

      // ----------------------------
      // UNANSWERED
      // ----------------------------
      if (
        !selectedAnswer ||
        selectedAnswer.trim() === ""
      ) {
        unansweredQuestions++;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer: "",

          correctAnswer:
            question.correctAnswer,

          isCorrect: false,

          marks: 0,
        });

        continue;
      }

      attemptedQuestions++;

      // ----------------------------
      // CORRECT
      // +4
      // ----------------------------
      if (
        question.correctAnswer ===
        selectedAnswer
      ) {
        correctAnswers++;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer,

          correctAnswer:
            question.correctAnswer,

          isCorrect: true,

          marks: 4,
        });
      }

      // ----------------------------
      // WRONG
      // -1
      // ----------------------------
      else {
        wrongAnswers++;

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer,

          correctAnswer:
            question.correctAnswer,

          isCorrect: false,

          marks: -1,
        });
      }
    }

    // --------------------------------------------------------
    // FINAL NEET SCORE
    // --------------------------------------------------------
    const marks =
      correctAnswers * 4 -
      wrongAnswers;

    // --------------------------------------------------------
    // MAXIMUM MARKS
    // --------------------------------------------------------
    const totalQuestions =
      questions.length;

    const maxMarks =
      totalQuestions * 4;

    // --------------------------------------------------------
    // PERCENTAGE
    // --------------------------------------------------------
    const percentage =
      maxMarks > 0
        ? Number(
            (
              (marks / maxMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    // --------------------------------------------------------
    // GRADE
    // --------------------------------------------------------
    let grade = "F";

    if (percentage >= 90) {
      grade = "A+";
    } else if (percentage >= 80) {
      grade = "A";
    } else if (percentage >= 70) {
      grade = "B";
    } else if (percentage >= 60) {
      grade = "C";
    } else if (percentage >= 50) {
      grade = "D";
    }

    // --------------------------------------------------------
    // PASS / FAIL
    // --------------------------------------------------------
    const resultStatus =
      percentage >= 40
        ? "PASS"
        : "FAIL";

    // --------------------------------------------------------
    // TEST TITLE
    // --------------------------------------------------------
    const dailyTestTitle =
      questions[0]?.testTitle ||
      "Daily Practice Assessment";

    // --------------------------------------------------------
    // SAVE RESULT
    // --------------------------------------------------------
    const result =
      await Result.create({
        studentId,

        studentName:
          studentName || "",

        examId: null,

        examName:
          dailyTestTitle,

        subject:
          questions[0]?.subject ||
          "General",

        totalQuestions,

        attemptedQuestions,

        unansweredQuestions,

        correctAnswers,

        wrongAnswers,

        marks,

        percentage,

        grade,

        status:
          resultStatus,

        timeTaken:
          timeTaken || 0,

        warnings:
          warnings || 0,

        rank: 0,

        review,
      });

    // --------------------------------------------------------
    // UPDATE SESSION
    // --------------------------------------------------------
    session.answers =
      answers;

    session.score =
      marks;

    session.status =
      "completed";

    session.endTime =
      new Date();

    await session.save();

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------
    res.status(201).json({
      success: true,

      message:
        "Daily test submitted successfully",

      result: {
        _id: result._id,

        totalQuestions,

        attemptedQuestions,

        unansweredQuestions,

        correctAnswers,

        wrongAnswers,

        marks,

        maxMarks,

        percentage,

        grade,

        status:
          resultStatus,

        timeTaken:
          timeTaken || 0,

        warnings:
          warnings || 0,

        review,
      },
    });
  } catch (error: any) {
    console.error(
      "SUBMIT DAILY TEST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to submit daily test",
    });
  }
};