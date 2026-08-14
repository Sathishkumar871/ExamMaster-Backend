
import { Request, Response } from "express";

import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";
import Student from "../models/Student";

// ============================================================
// HELPERS
// ============================================================

const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

const normalizeYear = (value: any): string => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const createYearRegex = (year: string): RegExp => {
  return new RegExp(
    `^${escapeRegex(
      String(year || "")
        .trim()
        .replace(/\s+/g, " ")
    )}$`,
    "i"
  );
};

// ============================================================
// FIND STUDENT
// ============================================================

const findStudent = async (studentId: string) => {
  const value = String(studentId || "").trim();

  if (!value) {
    return null;
  }

  const conditions: any[] = [
    {
      studentId: value,
    },
  ];

  // Avoid invalid ObjectId errors
  if (/^[0-9a-fA-F]{24}$/.test(value)) {
    conditions.push({
      _id: value,
    });
  }

  return Student.findOne({
    $or: conditions,
  }).lean();
};

// ============================================================
// GET DAILY TESTS
//
// GET /api/daily-tests?studentId=STU001
// GET /api/daily-tests?studentId=STU001&subject=Physics
// GET /api/daily-tests?studentId=STU001&chapter=Motion
// ============================================================

export const getDailyTests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      subject,
      chapter,
    } = req.query;

    // --------------------------------------------------------
    // VALIDATE STUDENT ID
    // --------------------------------------------------------

    const studentIdValue = String(
      studentId || ""
    ).trim();

    if (
      !studentIdValue ||
      studentIdValue === "undefined" ||
      studentIdValue === "null"
    ) {
      res.status(400).json({
        success: false,
        message:
          "StudentId is required to load daily tests",
        tests: [],
      });

      return;
    }

    // --------------------------------------------------------
    // FIND STUDENT
    // --------------------------------------------------------

    const student =
      await findStudent(studentIdValue);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
        tests: [],
      });

      return;
    }

    // --------------------------------------------------------
    // STUDENT YEAR
    // --------------------------------------------------------

    const studentYear = String(
      (student as any).year || ""
    )
      .trim()
      .replace(/\s+/g, " ");

    const normalizedStudentYear =
      normalizeYear(studentYear);

    if (!normalizedStudentYear) {
      res.status(400).json({
        success: false,
        message:
          "Student academic year is not configured",
        tests: [],
      });

      return;
    }

    console.log(
      "================================================"
    );

    console.log(
      "GET DAILY TESTS"
    );

    console.log(
      "STUDENT:",
      (student as any).studentId
    );

    console.log(
      "STUDENT YEAR:",
      studentYear
    );

    // --------------------------------------------------------
    // BASE FILTER
    // --------------------------------------------------------

    const filter: any = {
      testCategory: "daily",
      isPublished: true,

      academicYear:
        createYearRegex(studentYear),
    };

    // --------------------------------------------------------
    // SUBJECT FILTER
    // --------------------------------------------------------

    const subjectValue =
      String(subject || "").trim();

    if (
      subjectValue &&
      subjectValue !== "All" &&
      subjectValue !== "undefined" &&
      subjectValue !== "null"
    ) {
      filter.subject = new RegExp(
        `^${escapeRegex(subjectValue)}$`,
        "i"
      );
    }

    // --------------------------------------------------------
    // CHAPTER FILTER
    // --------------------------------------------------------

    const chapterValue =
      String(chapter || "").trim();

    if (
      chapterValue &&
      chapterValue !== "All" &&
      chapterValue !== "undefined" &&
      chapterValue !== "null"
    ) {
      filter.chapter = new RegExp(
        `^${escapeRegex(chapterValue)}$`,
        "i"
      );
    }

    console.log(
      "GET DAILY TESTS FILTER:",
      filter
    );

    // --------------------------------------------------------
    // FETCH QUESTIONS
    // --------------------------------------------------------

    const questions =
      await QuestionBank.find(filter)
        .sort({
          testDate: -1,
          createdAt: -1,
          questionNumber: 1,
        })
        .lean();

    console.log(
      "DAILY QUESTIONS FOUND:",
      questions.length
    );

    // --------------------------------------------------------
    // GROUP BY TEST ID
    // --------------------------------------------------------

    const groupedTests: Record<string, any> = {};

    for (const question of questions) {
      const testId = String(
        (question as any).testId || ""
      ).trim();

      if (!testId) {
        continue;
      }

      if (!groupedTests[testId]) {
        groupedTests[testId] = {
          _id: testId,

          title:
            (question as any).testTitle ||
            "Daily Practice Assessment",

          subject:
            (question as any).subject || "",

          chapter:
            (question as any).chapter || "",

          examType:
            (question as any).examType ||
            "NEET",

          academicYear:
            (question as any).academicYear || "",

          testDate:
            (question as any).testDate || "",

          testTime:
            (question as any).testTime || "",

          testCategory:
            (question as any).testCategory ||
            "daily",

          isPublished:
            Boolean(
              (question as any).isPublished
            ),

          questions: [],
        };
      }

      // ------------------------------------------------------
      // SEND ONLY SAFE QUESTION DATA
      // ------------------------------------------------------

      groupedTests[testId].questions.push({
        _id: String(question._id),

        questionId: String(question._id),

        questionNumber:
          (question as any).questionNumber,

        question:
          (question as any).question || "",

        options:
          Array.isArray(
            (question as any).options
          )
            ? (question as any).options
            : [],

        subject:
          (question as any).subject || "",

        chapter:
          (question as any).chapter || "",

        testTitle:
          (question as any).testTitle ||
          "Daily Practice Assessment",

        testId,

        testCategory:
          (question as any).testCategory ||
          "daily",

        examType:
          (question as any).examType ||
          "NEET",

        academicYear:
          (question as any).academicYear || "",

        imageUrl:
          (question as any).imageUrl || "",
      });
    }

    // --------------------------------------------------------
    // CONVERT TO ARRAY
    // --------------------------------------------------------

    const displayTests =
      Object.values(groupedTests).map(
        (test: any) => {
          test.questions.sort(
            (a: any, b: any) =>
              Number(
                a.questionNumber || 0
              ) -
              Number(
                b.questionNumber || 0
              )
          );

          return {
            _id: test._id,

            title: test.title,

            subject: test.subject,

            chapter: test.chapter,

            examType: test.examType,

            academicYear:
              test.academicYear,

            totalQuestions:
              test.questions.length,

            testDate: test.testDate,

            testTime: test.testTime,

            testCategory:
              test.testCategory,

            isPublished:
              test.isPublished,

            difficulty: "Mixed",

            // 1 minute per question
            duration: Math.max(
              test.questions.length,
              5
            ),

            totalMarks:
              test.questions.length * 4,

            negativeMarks: 1,

            active: true,

            questions:
              test.questions,
          };
        }
      );

    console.log(
      "DAILY TESTS GROUPED:",
      displayTests.length
    );

    console.log(
      "VISIBLE YEAR:",
      studentYear
    );

    console.log(
      "================================================"
    );

    res.status(200).json({
      success: true,

      studentId:
        String(
          (student as any).studentId
        ),

      studentYear,

      total:
        displayTests.length,

      tests:
        displayTests,
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

      tests: [],
    });
  }
};

// ============================================================
// START DAILY TEST
//
// POST /api/daily-tests/start
//
// {
//   studentId,
//   studentName,
//   testId
// }
// ============================================================

export const startDailyTest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      studentName,
      testId,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    const studentIdValue =
      String(studentId || "").trim();

    const testIdValue =
      String(testId || "").trim();

    if (
      !studentIdValue ||
      studentIdValue === "undefined" ||
      studentIdValue === "null"
    ) {
      res.status(400).json({
        success: false,
        message: "StudentId required",
      });

      return;
    }

    if (
      !testIdValue ||
      testIdValue === "undefined" ||
      testIdValue === "null"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Daily test ID required",
      });

      return;
    }

    // --------------------------------------------------------
    // FIND STUDENT
    // --------------------------------------------------------

    const student =
      await findStudent(studentIdValue);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });

      return;
    }

    // --------------------------------------------------------
    // STUDENT YEAR
    // --------------------------------------------------------

    const studentYear =
      String(
        (student as any).year || ""
      )
        .trim()
        .replace(/\s+/g, " ");

    if (!studentYear) {
      res.status(400).json({
        success: false,
        message:
          "Student academic year is not configured",
      });

      return;
    }

    // --------------------------------------------------------
    // FIND DAILY TEST QUESTIONS
    // --------------------------------------------------------

    const questions =
      await QuestionBank.find({
        testId: testIdValue,

        testCategory: "daily",

        isPublished: true,

        academicYear:
          createYearRegex(
            studentYear
          ),
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

    console.log(
      "================================================"
    );

    console.log(
      "START DAILY TEST:",
      testIdValue
    );

    console.log(
      "STUDENT:",
      (student as any).studentId
    );

    console.log(
      "STUDENT YEAR:",
      studentYear
    );

    console.log(
      "QUESTIONS FOUND:",
      questions.length
    );

    // --------------------------------------------------------
    // TEST NOT AVAILABLE
    // --------------------------------------------------------

    if (!questions.length) {
      res.status(403).json({
        success: false,
        message:
          "This daily test is not available for your academic year",
      });

      return;
    }

    // --------------------------------------------------------
    // EXTRA YEAR VALIDATION
    // --------------------------------------------------------

    const normalizedStudentYear =
      normalizeYear(studentYear);

    const invalidQuestion =
      questions.find(
        (question: any) =>
          normalizeYear(
            question.academicYear
          ) !==
          normalizedStudentYear
      );

    if (invalidQuestion) {
      res.status(403).json({
        success: false,
        message:
          "Daily test contains questions from another academic year",
      });

      return;
    }

    // --------------------------------------------------------
    // CREATE EXAM SESSION
    // --------------------------------------------------------

    const session =
      await ExamSession.create({
        studentId:
          studentIdValue,

        examId:
          testIdValue,

        questions:
          questions.map(
            (question: any) =>
              question._id
          ),

        answers: [],

        score: 0,

        status: "started",

        startTime: new Date(),
      });

    // --------------------------------------------------------
    // SHUFFLE OPTIONS
    // --------------------------------------------------------

    const displayQuestions =
      questions.map(
        (question: any) => ({
          _id:
            String(
              question._id
            ),

          questionId:
            String(
              question._id
            ),

          questionNumber:
            question.questionNumber,

          question:
            question.question || "",

          options:
            Array.isArray(
              question.options
            )
              ? [
                  ...question.options,
                ].sort(
                  () =>
                    Math.random() -
                    0.5
                )
              : [],

          subject:
            question.subject || "",

          chapter:
            question.chapter || "",

          testTitle:
            question.testTitle ||
            "Daily Practice Assessment",

          testId:
            String(
              question.testId
            ),

          testCategory:
            question.testCategory ||
            "daily",

          examType:
            question.examType ||
            "NEET",

          academicYear:
            question.academicYear ||
            "",

          imageUrl:
            question.imageUrl ||
            "",
        })
      );

    // --------------------------------------------------------
    // DURATION
    //
    // 1 MINUTE / QUESTION
    // MINIMUM 5 MINUTES
    // --------------------------------------------------------

    const duration =
      Math.max(
        questions.length * 60,
        300
      );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(200).json({
      success: true,

      message:
        "Daily test started successfully",

      sessionId:
        String(
          session._id
        ),

      studentId:
        String(
          (student as any).studentId
        ),

      studentName:
        studentName ||
        (student as any).name ||
        "",

      studentYear,

      testTitle:
        questions[0]?.testTitle ||
        "Daily Practice Assessment",

      testId:
        testIdValue,

      subject:
        questions[0]?.subject ||
        "",

      chapter:
        questions[0]?.chapter ||
        "",

      examType:
        questions[0]?.examType ||
        "NEET",

      academicYear:
        questions[0]?.academicYear ||
        "",

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
//
// POST /api/daily-tests/submit
//
// Correct    = +4
// Wrong      = -1
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

    const studentIdValue =
      String(studentId || "").trim();

    const sessionIdValue =
      String(sessionId || "").trim();

    if (
      !studentIdValue ||
      !sessionIdValue ||
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
        sessionIdValue
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
    // STUDENT CHECK
    // --------------------------------------------------------

    if (
      String(
        session.studentId
      ) !==
      studentIdValue
    ) {
      res.status(403).json({
        success: false,
        message:
          "This exam session does not belong to this student",
      });

      return;
    }

    // --------------------------------------------------------
    // DOUBLE SUBMISSION
    // --------------------------------------------------------

    if (
      String(
        session.status
      ) === "completed"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Daily test already submitted",
      });

      return;
    }

    // --------------------------------------------------------
    // FETCH QUESTIONS
    // --------------------------------------------------------

    const questionIds =
      session.questions || [];

    const questions =
      await QuestionBank.find({
        _id: {
          $in: questionIds,
        },
      }).lean();

    if (!questions.length) {
      res.status(404).json({
        success: false,
        message:
          "Questions not found",
      });

      return;
    }

    // --------------------------------------------------------
    // CREATE ANSWER MAP
    //
    // Faster than answers.find() for every question
    // --------------------------------------------------------

    const answerMap =
      new Map<string, string>();

    for (const item of answers) {
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

    // --------------------------------------------------------
    // MARKING
    // --------------------------------------------------------

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let attemptedQuestions = 0;

    let unansweredQuestions = 0;

    const review: any[] = [];

    // --------------------------------------------------------
    // CHECK QUESTIONS
    // --------------------------------------------------------

    for (const question of questions) {
      const questionId =
        String(
          question._id
        );

      const selectedAnswer =
        answerMap.get(
          questionId
        ) || "";

      // ------------------------------------------------------
      // UNANSWERED
      // ------------------------------------------------------

      if (!selectedAnswer) {
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

      // ------------------------------------------------------
      // ATTEMPTED
      // ------------------------------------------------------

      attemptedQuestions++;

      // ------------------------------------------------------
      // CORRECT
      // ------------------------------------------------------

      if (
        String(
          question.correctAnswer
        ).trim() ===
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

        continue;
      }

      // ------------------------------------------------------
      // WRONG
      // ------------------------------------------------------

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

    // --------------------------------------------------------
    // SCORE
    // --------------------------------------------------------

    const marks =
      correctAnswers * 4 -
      wrongAnswers;

    // --------------------------------------------------------
    // TOTAL QUESTIONS
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
              (marks /
                maxMarks) *
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
    // TEST INFORMATION
    // --------------------------------------------------------

    const firstQuestion =
      questions[0];

    // --------------------------------------------------------
    // SAVE RESULT
    // --------------------------------------------------------

    const result =
      await Result.create({
        studentId:
          studentIdValue,

        studentName:
          studentName || "",

        examId:
          session.examId,

        examName:
          firstQuestion?.testTitle ||
          "Daily Practice Assessment",

        subject:
          firstQuestion?.subject ||
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
          Number(
            timeTaken
          ) || 0,

        warnings:
          Number(
            warnings
          ) || 0,

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
        _id:
          result._id,

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
          Number(
            timeTaken
          ) || 0,

        warnings:
          Number(
            warnings
          ) || 0,

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

