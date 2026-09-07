import { Request, Response } from "express";

import Result from "../models/resultModel";
import DailyTest from "../models/DailyTest";

// ============================================================
// HELPER
// ============================================================

const normalizeText = (
  value: unknown
): string => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
};

// ============================================================
// NORMALIZE CATEGORY
// ============================================================

const normalizeCategory = (
  value: unknown
): "mock" | "daily" | "subject" => {
  const category =
    normalizeText(value).toLowerCase();

  if (category === "mock") {
    return "mock";
  }

  if (category === "daily") {
    return "daily";
  }

  return "subject";
};

// ============================================================
// SUBJECT ORDER
// ============================================================

const SUBJECT_ORDER = [
  "Physics",
  "Chemistry",
  "Botany",
  "Zoology",
  "Mathematics",
];

// ============================================================
// GET SUBJECT ORDER
// ============================================================

const getSubjectOrder = (
  subject: string
): number => {
  const index =
    SUBJECT_ORDER.findIndex(
      (item) =>
        item.toLowerCase() ===
        subject.toLowerCase()
    );

  return index === -1
    ? 999
    : index;
};

// ============================================================
// SUBMIT EXAM RESULT
// ============================================================

export const submitResult = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      studentId,
      studentName,
      examId,
      answers,
      timeTaken,
      warnings,
      testCategory,
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
          "StudentId, ExamId and Answers required",
      });
    }

    // ========================================================
    // GET TEST
    // ========================================================

    const test =
      await DailyTest.findById(
        examId
      );

    if (!test) {
      return res.status(404).json({
        success: false,

        message:
          "Exam not found",
      });
    }

    // ========================================================
    // CATEGORY
    // ========================================================

    const category =
      normalizeCategory(
        testCategory ||
          (test as any).testCategory
      );

    // ========================================================
    // TEST LEVEL EXAM TYPE
    // ========================================================

    const testExamType =
      normalizeText(
        (test as any).examType
      ) ||
      normalizeText(
        (test as any).targetExamLevel
      ) ||
      "";

    // ========================================================
    // EVALUATED QUESTION TYPE
    // ========================================================

    interface EvaluatedQuestion {
      questionId: any;

      question: string;

      questionType?:
        | "MCQ"
        | "TABLE"
        | "DIAGRAM";

      options?: string[];

      imageUrl?: string;

      questionImage?: string;

      tableHeaders?: string[];

      tableRows?: string[][];

      selectedAnswer: string;

      correctAnswer: string;

      isCorrect: boolean;

      marks: number;

      result:
        | "correct"
        | "wrong"
        | "unanswered"
        | "not_evaluated";

      explanation?: string;

      subject: string;

      examType: string;
    }

    const evaluatedQuestions: EvaluatedQuestion[] =
      [];

    // ========================================================
    // EVALUATE ALL QUESTIONS
    // ========================================================

    test.questions.forEach(
      (
        question: any,
        index: number
      ) => {
        const selectedAnswer =
          normalizeText(
            answers[index]
          );

        const correctAnswer =
          normalizeText(
            question.correctAnswer
          );

        const isAnswered =
          selectedAnswer !== "";

        const isCorrect =
          isAnswered &&
          correctAnswer !== "" &&
          selectedAnswer.toLowerCase() ===
            correctAnswer.toLowerCase();

        // ----------------------------------------------------
        // SUBJECT
        // ----------------------------------------------------

        const questionSubject =
          normalizeText(
            question.subject
          ) ||
          normalizeText(
            (question as any)
              .subjectName
          ) ||
          normalizeText(
            (test as any)
              .subject
          ) ||
          "General";

        // ----------------------------------------------------
        // EXAM TYPE
        // ----------------------------------------------------

        const questionExamType =
          normalizeText(
            question.examType
          ) ||
          normalizeText(
            question.targetExamLevel
          ) ||
          testExamType ||
          "N/A";

        // ----------------------------------------------------
        // QUESTION MARKS
        // ----------------------------------------------------

        const marksPerQuestion =
          Number(
            question.marksPerQuestion
          ) > 0
            ? Number(
                question.marksPerQuestion
              )
            : Number(
                (test as any)
                  .marksPerQuestion
              ) > 0
              ? Number(
                  (test as any)
                    .marksPerQuestion
                )
              : 4;

        const negativeMarks =
          Number(
            question.negativeMarks
          ) >= 0
            ? Number(
                question.negativeMarks
              )
            : Number(
                (test as any)
                  .negativeMarks
              ) >= 0
              ? Number(
                  (test as any)
                    .negativeMarks
                )
              : 1;

        // ----------------------------------------------------
        // CALCULATE QUESTION MARKS
        // ----------------------------------------------------

        let questionMarks = 0;

        let questionResult:
          | "correct"
          | "wrong"
          | "unanswered" =
          "unanswered";

        if (isCorrect) {
          questionMarks =
            marksPerQuestion;

          questionResult =
            "correct";
        } else if (
          isAnswered
        ) {
          questionMarks =
            -negativeMarks;

          questionResult =
            "wrong";
        } else {
          questionMarks = 0;

          questionResult =
            "unanswered";
        }

        // ----------------------------------------------------
        // REVIEW
        // ----------------------------------------------------

        evaluatedQuestions.push({
          questionId:
            question._id,

          question:
            question.question ||
            "Question",

          questionType:
            question.questionType,

          options:
            Array.isArray(
              question.options
            )
              ? question.options
              : [],

          imageUrl:
            question.imageUrl ||
            "",

          questionImage:
            question.questionImage ||
            "",

          tableHeaders:
            Array.isArray(
              question.tableHeaders
            )
              ? question.tableHeaders
              : [],

          tableRows:
            Array.isArray(
              question.tableRows
            )
              ? question.tableRows
              : [],

          selectedAnswer:
            isAnswered
              ? selectedAnswer
              : "Not Attempted",

          correctAnswer:
            correctAnswer ||
            "Not Available",

          isCorrect,

          marks:
            questionMarks,

          result:
            questionResult,

          explanation:
            question.explanation ||
            "",

          subject:
            questionSubject,

          examType:
            questionExamType,
        });
      }
    );

    // ========================================================
    // GROUP QUESTIONS BY SUBJECT
    // ========================================================

    const subjectGroups =
      new Map<
        string,
        EvaluatedQuestion[]
      >();

    evaluatedQuestions.forEach(
      (
        question
      ) => {
        const subject =
          question.subject ||
          "General";

        if (
          !subjectGroups.has(
            subject
          )
        ) {
          subjectGroups.set(
            subject,
            []
          );
        }

        subjectGroups
          .get(subject)!
          .push(
            question
          );
      }
    );

    // ========================================================
    // SORT SUBJECTS
    // ========================================================

    const sortedSubjectGroups =
      Array.from(
        subjectGroups.entries()
      ).sort(
        (
          [subjectA],
          [subjectB]
        ) =>
          getSubjectOrder(
            subjectA
          ) -
            getSubjectOrder(
              subjectB
            ) ||
          subjectA.localeCompare(
            subjectB
          )
      );

    // ========================================================
    // DELETE PREVIOUS DUPLICATE RESULTS
    // ========================================================
    // This prevents duplicate records when the same test
    // is accidentally submitted more than once.
    // ========================================================

    await Result.deleteMany({
      studentId,

      examId,

      testCategory:
        category,
    });

    // ========================================================
    // CREATE SUBJECT RESULTS
    // ========================================================

    const createdResults: any[] =
      [];

    for (
      const [
        subject,
        questions,
      ] of sortedSubjectGroups
    ) {
      // ======================================================
      // COUNTERS
      // ======================================================

      let correctAnswers =
        0;

      let wrongAnswers =
        0;

      let attemptedQuestions =
        0;

      let unansweredQuestions =
        0;

      let subjectMarks =
        0;

      // ======================================================
      // EXAM TYPE
      // ======================================================

      const subjectExamType =
        questions.find(
          (
            question
          ) =>
            normalizeText(
              question.examType
            )
        )?.examType ||
        testExamType ||
        "N/A";

      // ======================================================
      // CALCULATE SUBJECT RESULT
      // ======================================================

      questions.forEach(
        (
          question
        ) => {
          if (
            question.result ===
            "correct"
          ) {
            correctAnswers++;

            attemptedQuestions++;

            subjectMarks +=
              question.marks;
          } else if (
            question.result ===
            "wrong"
          ) {
            wrongAnswers++;

            attemptedQuestions++;

            subjectMarks +=
              question.marks;
          } else {
            unansweredQuestions++;
          }
        }
      );

      // ======================================================
      // SUBJECT TOTAL QUESTIONS
      // ======================================================

      const totalQuestions =
        questions.length;

      // ======================================================
      // MARKING CONFIGURATION
      // ======================================================

      const marksPerQuestion =
        questions[0]
          ?.marks &&
        questions[0]
          .marks > 0
          ? Math.max(
              ...questions.map(
                (
                  question
                ) =>
                  question.marks > 0
                    ? question.marks
                    : 0
              )
            )
          : Number(
              (test as any)
                .marksPerQuestion
            ) > 0
            ? Number(
                (test as any)
                  .marksPerQuestion
              )
            : 4;

      const negativeMarks =
        Number(
          (test as any)
            .negativeMarks
        ) >= 0
          ? Number(
              (test as any)
                .negativeMarks
            )
          : 1;

      // ======================================================
      // MAX MARKS
      // ======================================================

      const maxMarks =
        totalQuestions *
        marksPerQuestion;

      // ======================================================
      // FINAL SUBJECT MARKS
      // ======================================================

      const finalMarks =
        Number(
          subjectMarks.toFixed(
            2
          )
        );

      // ======================================================
      // PERCENTAGE
      // ======================================================

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

      // ======================================================
      // GRADE
      // ======================================================

      let grade =
        "F";

      if (
        percentage >=
        90
      ) {
        grade =
          "A+";
      } else if (
        percentage >=
        80
      ) {
        grade =
          "A";
      } else if (
        percentage >=
        70
      ) {
        grade =
          "B";
      } else if (
        percentage >=
        60
      ) {
        grade =
          "C";
      } else if (
        percentage >=
        50
      ) {
        grade =
          "D";
      }

      // ======================================================
      // PASS / FAIL
      // ======================================================

      const status:
        | "PASS"
        | "FAIL" =
        percentage >=
        40
          ? "PASS"
          : "FAIL";

      // ======================================================
      // RESULT TIME
      // ======================================================

      const resultAvailableAt =
        new Date();

      // ======================================================
      // CREATE RESULT DOCUMENT
      // ======================================================

      const subjectResult =
        await Result.create({
          // --------------------------------------------------
          // STUDENT
          // --------------------------------------------------

          studentId,

          studentName:
            studentName ||
            "Student",

          // --------------------------------------------------
          // EXAM
          // --------------------------------------------------

          examId,

          examName:
            (test as any)
              .title ||
            (test as any)
              .testTitle ||
            "Mock Test",

          // --------------------------------------------------
          // CATEGORY
          // --------------------------------------------------

          testCategory:
            category,

          // --------------------------------------------------
          // EXAM TYPE
          // --------------------------------------------------

          examType:
            subjectExamType,

          // --------------------------------------------------
          // SUBJECT
          // --------------------------------------------------

          subject,

          // --------------------------------------------------
          // CHAPTER
          // --------------------------------------------------

          chapter:
            normalizeText(
              (test as any)
                .chapter
            ) ||
            "Full Assessment",

          // --------------------------------------------------
          // CLASS
          // --------------------------------------------------

          className:
            normalizeText(
              (test as any)
                .className
            ),

          // --------------------------------------------------
          // COUNTS
          // --------------------------------------------------

          totalQuestions,

          attemptedQuestions,

          unansweredQuestions,

          correctAnswers,

          wrongAnswers,

          // --------------------------------------------------
          // MARKS
          // --------------------------------------------------

          marks:
            finalMarks,

          maxMarks,

          marksPerQuestion,

          negativeMarks,

          percentage,

          grade,

          status,

          // --------------------------------------------------
          // EXAM INFO
          // --------------------------------------------------

          timeTaken:
            Number(
              timeTaken
            ) || 0,

          warnings:
            Number(
              warnings
            ) || 0,

          autoSubmitted:
            Boolean(
              (req.body as any)
                .autoSubmitted
            ),

          rank: 0,

          // --------------------------------------------------
          // RESULT RELEASE
          // --------------------------------------------------

          resultAvailableAt,

          isResultPublished:
            true,

          // --------------------------------------------------
          // REVIEW
          // --------------------------------------------------

          review:
            questions.map(
              (
                question
              ) => ({
                questionId:
                  question.questionId,

                question:
                  question.question,

                questionType:
                  question.questionType,

                options:
                  question.options,

                imageUrl:
                  question.imageUrl,

                questionImage:
                  question.questionImage,

                tableHeaders:
                  question.tableHeaders,

                tableRows:
                  question.tableRows,

                selectedAnswer:
                  question.selectedAnswer,

                correctAnswer:
                  question.correctAnswer,

                isCorrect:
                  question.isCorrect,

                marks:
                  question.marks,

                result:
                  question.result,

                explanation:
                  question.explanation,
              })
            ),
        });

      createdResults.push(
        subjectResult
      );
    }

    // ========================================================
    // SAFETY CHECK
    // ========================================================

    if (
      createdResults.length ===
      0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "No subject results could be generated.",
      });
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message:
        "Exam submitted successfully with subject-wise results.",

      // ------------------------------------------------------
      // MAIN INFO
      // ------------------------------------------------------

      examId,

      examName:
        (test as any)
          .title ||
        (test as any)
          .testTitle ||
        "Mock Test",

      testCategory:
        category,

      examType:
        testExamType ||
        createdResults[0]
          ?.examType ||
        "N/A",

      // ------------------------------------------------------
      // SUBJECT RESULTS
      // ------------------------------------------------------

      subjectResults:
        createdResults.map(
          (
            result
          ) => ({
            id:
              result._id,

            _id:
              result._id,

            examId:
              result.examId,

            examName:
              result.examName,

            testCategory:
              result.testCategory,

            examType:
              result.examType,

            subject:
              result.subject,

            chapter:
              result.chapter,

            className:
              result.className,

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
              true,

            locked:
              false,

            review:
              result.review ||
              [],
          })
        ),

      // ------------------------------------------------------
      // COUNT
      // ------------------------------------------------------

      totalSubjectResults:
        createdResults.length,
    });
  } catch (error: any) {
    console.error(
      "SUBMIT RESULT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to submit result. Please try again.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error?.message
          : undefined,
    });
  }
};

// ============================================================
// GET ALL RESULTS OF STUDENT
// ============================================================

export const getStudentResults = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      studentId,
    } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,

        message:
          "Student ID is required",
      });
    }

    const results =
      await Result.find({
        studentId,
      }).sort({
        createdAt: -1,
      });

    const processedResults =
      results.map(
        (result: any) => ({
          ...result.toObject(),

          locked:
            false,

          isResultPublished:
            true,

          review:
            result.review || [],
        })
      );

    return res.status(200).json({
      success: true,

      count:
        processedResults.length,

      results:
        processedResults,
    });
  } catch (error: any) {
    console.error(
      "GET STUDENT RESULTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch student results",
    });
  }
};

// ============================================================
// GET SINGLE RESULT
// ============================================================

export const getSingleResult = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const result =
      await Result.findById(
        req.params.id
      );

    if (!result) {
      return res.status(404).json({
        success: false,

        message:
          "Result not found",
      });
    }

    if (
      !result.isResultPublished
    ) {
      result.isResultPublished =
        true;

      result.resultAvailableAt =
        new Date();

      await result.save();
    }

    return res.status(200).json({
      success: true,

      locked: false,

      result: {
        ...result.toObject(),

        locked: false,

        isResultPublished:
          true,

        review:
          result.review || [],
      },
    });
  } catch (error: any) {
    console.error(
      "GET SINGLE RESULT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch result",
    });
  }
};

// ============================================================
// GET LATEST RESULT
// ============================================================

export const getLatestResult = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const result =
      await Result.findOne({
        studentId:
          req.params.studentId,
      }).sort({
        createdAt: -1,
      });

    if (!result) {
      return res.status(404).json({
        success: false,

        message:
          "No Result Found",
      });
    }

    if (
      !result.isResultPublished
    ) {
      result.isResultPublished =
        true;

      result.resultAvailableAt =
        new Date();

      await result.save();
    }

    return res.status(200).json({
      success: true,

      locked: false,

      result: {
        ...result.toObject(),

        locked: false,

        isResultPublished:
          true,

        review:
          result.review || [],
      },
    });
  } catch (error: any) {
    console.error(
      "GET LATEST RESULT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch latest result",
    });
  }
};

// ============================================================
// GET TOP RESULTS
// ============================================================

export const getTopResults = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const results =
      await Result.find({
        isResultPublished:
          true,
      })
        .sort({
          marks: -1,
          percentage: -1,
        })
        .limit(20);

    return res.status(200).json({
      success: true,

      results,
    });
  } catch (error: any) {
    console.error(
      "GET TOP RESULTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch top results",
    });
  }
};

// ============================================================
// GET SUBJECT RESULTS
// ============================================================

export const getSubjectResults = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const results =
      await Result.find({
        subject:
          req.params.subject,

        isResultPublished:
          true,
      });

    return res.status(200).json({
      success: true,

      count:
        results.length,

      results,
    });
  } catch (error: any) {
    console.error(
      "GET SUBJECT RESULTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch subject results",
    });
  }
};

// ============================================================
// GET STUDENT PERFORMANCE ANALYTICS
// ============================================================

export const getStudentPerformanceAnalytics =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const {
        studentId,
      } = req.params;

      const results =
        await Result.find({
          studentId,
        });

      if (
        !results ||
        results.length === 0
      ) {
        return res.status(200).json({
          success: true,

          weakTopics: [],

          recommendedStudyPlan: [],
        });
      }

      const subjectMap: {
        [key: string]: {
          correct: number;
          total: number;
        };
      } = {};

      results.forEach(
        (result: any) => {
          const subject =
            result.subject ||
            "General";

          if (
            !subjectMap[subject]
          ) {
            subjectMap[subject] = {
              correct: 0,
              total: 0,
            };
          }

          subjectMap[
            subject
          ].correct +=
            result.correctAnswers ||
            0;

          subjectMap[
            subject
          ].total +=
            result.totalQuestions ||
            0;
        }
      );

      const weakTopics: any[] =
        [];

      const recommendedStudyPlan: any[] =
        [];

      Object.keys(
        subjectMap
      ).forEach(
        (
          subject,
          index
        ) => {
          const data =
            subjectMap[subject];

          const accuracy =
            data.total > 0
              ? Math.round(
                  (
                    (data.correct /
                      data.total) *
                    100
                  )
                )
              : 0;

          if (
            accuracy < 70
          ) {
            weakTopics.push({
              id:
                index + 1,

              topic:
                `${subject} Core Concepts`,

              subject,

              accuracy:
                `${accuracy}%`,

              priority:
                accuracy < 50
                  ? "High Priority"
                  : "Medium Priority",
            });

            const hours =
              accuracy < 40
                ? 3.5
                : accuracy < 55
                  ? 2.5
                  : 2.0;

            recommendedStudyPlan.push({
              id:
                index + 1,

              subject:
                `${subject} Revision`,

              hours,

              completed:
                false,
            });
          }
        }
      );

      return res.status(200).json({
        success: true,

        weakTopics,

        recommendedStudyPlan,
      });
    } catch (error: any) {
      console.error(
        "GET STUDENT PERFORMANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch student performance analytics",
      });
    }
  };

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  submitResult,
  getStudentResults,
  getSingleResult,
  getLatestResult,
  getTopResults,
  getSubjectResults,
  getStudentPerformanceAnalytics,
};