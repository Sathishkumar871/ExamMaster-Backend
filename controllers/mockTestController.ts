import {
  Request,
  Response,
} from "express";

import crypto from "crypto";
import mongoose from "mongoose";

import Question from "../models/questionModel";
import Exam from "../models/examModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";

// ============================================================
// TYPES
// ============================================================

interface AuthRequest extends Request {
  user?: {
    id?: string;
    _id?: string;
    studentId?: string;
    studentName?: string;
    name?: string;
  };
}

// ============================================================
// HELPERS
// ============================================================

const getStudentId = (
  req: AuthRequest
): string => {
  const authenticatedStudentId =
    req.user?.studentId ||
    req.user?.id ||
    req.user?._id;

  if (authenticatedStudentId) {
    return String(
      authenticatedStudentId
    ).trim();
  }

  return String(
    req.body?.studentId ||
      req.query?.studentId ||
      ""
  ).trim();
};

// ============================================================

const getStudentName = (
  req: AuthRequest
): string => {
  return String(
    req.user?.studentName ||
      req.user?.name ||
      req.body?.studentName ||
      "Student"
  ).trim();
};

// ============================================================

const getDeviceId = (
  req: Request
): string => {
  const header =
    req.headers["x-device-id"];

  if (
    typeof header === "string" &&
    header.trim()
  ) {
    return header.trim();
  }

  return String(
    req.body?.deviceId || ""
  ).trim();
};

// ============================================================

const getDeviceSessionId = (
  req: Request
): string => {
  const header =
    req.headers[
      "x-exam-session-token"
    ];

  if (
    typeof header === "string" &&
    header.trim()
  ) {
    return header.trim();
  }

  return String(
    req.body?.deviceSessionId || ""
  ).trim();
};

// ============================================================

const generateToken = (): string => {
  return crypto
    .randomBytes(32)
    .toString("hex");
};

// ============================================================

const generateDeviceId = (): string => {
  return crypto
    .randomBytes(24)
    .toString("hex");
};

// ============================================================

const normalizeAnswer = (
  value: unknown
): string => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
};

// ============================================================

const sameAnswer = (
  a: unknown,
  b: unknown
): boolean => {
  return (
    normalizeAnswer(a).toLowerCase() ===
    normalizeAnswer(b).toLowerCase()
  );
};

// ============================================================

const safeNumber = (
  value: unknown,
  fallback = 0
): number => {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
};

// ============================================================

const isValidObjectId = (
  value: unknown
): boolean => {
  return mongoose.Types.ObjectId.isValid(
    String(value)
  );
};

// ============================================================
// ESCAPE REGEX
// ============================================================

const escapeRegex = (
  value: string
): string => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ============================================================
// SERVER TIMER
// ============================================================

const getDurationSeconds = (
  exam: any,
  questionCount: number
): number => {
  const durationMinutes =
    safeNumber(
      exam?.duration,
      0
    );

  if (durationMinutes > 0) {
    return Math.max(
      60,
      Math.floor(
        durationMinutes * 60
      )
    );
  }

  return Math.max(
    60,
    questionCount * 60
  );
};

// ============================================================

const getRemainingSeconds = (
  session: any
): number => {
  const startTime =
    new Date(
      session.startTime
    ).getTime();

  const durationSeconds =
    Math.max(
      1,
      safeNumber(
        session.durationSeconds,
        60
      )
    );

  const endTime =
    startTime +
    durationSeconds * 1000;

  return Math.max(
    0,
    Math.floor(
      (endTime - Date.now()) /
        1000
    )
  );
};

// ============================================================

const isExpired = (
  session: any
): boolean => {
  return (
    getRemainingSeconds(
      session
    ) <= 0
  );
};

// ============================================================
// DISPLAY QUESTIONS
// ============================================================
//
// correctAnswer is NEVER returned to student.
// ============================================================

const getDisplayQuestions = (
  questions: any[]
): any[] => {
  return questions.map(
    (q: any) => ({
      questionId:
        String(q._id),

      questionNumber:
        q.questionNumber,

      question:
        q.question,

      options:
        Array.isArray(q.options)
          ? q.options
          : [],

      subject:
        q.subject || "",

      chapter:
        q.chapter || "",

      imageUrl:
        q.imageUrl || "",
    })
  );
};

// ============================================================
// ANSWER SANITIZATION
// ============================================================

const sanitizeAnswers = (
  answers: any,
  allowedIds: Set<string>
): {
  questionId: string;
  answer: string;
}[] => {
  const map =
    new Map<string, string>();

  if (!Array.isArray(answers)) {
    return [];
  }

  for (
    const item of answers
  ) {
    if (
      !item ||
      !item.questionId
    ) {
      continue;
    }

    const questionId =
      String(
        item.questionId
      );

    if (
      !allowedIds.has(
        questionId
      )
    ) {
      continue;
    }

    map.set(
      questionId,
      normalizeAnswer(
        item.answer
      )
    );
  }

  return Array.from(
    map.entries()
  ).map(
    ([
      questionId,
      answer,
    ]) => ({
      questionId,
      answer,
    })
  );
};

// ============================================================
// REVIEW SANITIZATION
// ============================================================

const sanitizeReview = (
  value: any,
  allowedIds: Set<string>
): Record<
  string,
  boolean
> => {
  const output: Record<
    string,
    boolean
  > = {};

  if (
    !value ||
    typeof value !== "object"
  ) {
    return output;
  }

  for (
    const [
      questionId,
      marked,
    ] of Object.entries(value)
  ) {
    const id =
      String(questionId);

    if (
      allowedIds.has(id)
    ) {
      output[id] =
        Boolean(marked);
    }
  }

  return output;
};

// ============================================================
// GRADE
// ============================================================

const getGrade = (
  percentage: number
): string => {
  if (percentage >= 90) {
    return "A+";
  }

  if (percentage >= 80) {
    return "A";
  }

  if (percentage >= 70) {
    return "B";
  }

  if (percentage >= 60) {
    return "C";
  }

  if (percentage >= 50) {
    return "D";
  }

  return "F";
};

// ============================================================
// PASS / FAIL
// ============================================================

const getResultStatus = (
  percentage: number
): string => {
  return percentage >= 40
    ? "PASS"
    : "FAIL";
};

// ============================================================
// RESULT AVAILABLE TIME
// ============================================================

const getResultAvailableAt =
  (): Date => {
    const date =
      new Date();

    date.setDate(
      date.getDate() + 1
    );

    date.setHours(
      9,
      0,
      0,
      0
    );

    return date;
  };

// ============================================================
// GET MOCK TEST QUESTIONS
// ============================================================
//
// FLOW:
//
// 1. Find existing Questions.
// 2. Find published Exam.
// 3. If Exam does not exist, create a REAL Exam.
// 4. Existing Question._id values are linked to Exam.questions.
// 5. Return real Exam._id.
// 6. startMockTest validates the same real Exam.
//
// ============================================================

export const getMockTestQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const {
        className,
        academicYear,
        examType,
        subject,
      } = req.query;

      // ======================================================
      // INPUT
      // ======================================================

      const targetClass =
        String(
          className ||
            academicYear ||
            "2nd PUC"
        ).trim();

      const cleanExamType =
        String(
          examType ||
            "NEET"
        ).trim();

      const cleanSubject =
        String(
          subject || ""
        ).trim();

      // ======================================================
      // QUESTION FILTER
      // ======================================================

      const questionConditions: any[] =
        [
          {
            isPublished: true,
          },

          {
            $or: [
              {
                testCategory: {
                  $regex:
                    /^mock$/i,
                },
              },

              {
                category: {
                  $regex:
                    /^mock$/i,
                },
              },
            ],
          },
        ];

      // ======================================================
      // EXAM TYPE
      // ======================================================

      if (
        cleanExamType &&
        cleanExamType.toLowerCase() !==
          "all" &&
        cleanExamType.toLowerCase() !==
          "undefined"
      ) {
        const escapedExamType =
          escapeRegex(
            cleanExamType
          );

        questionConditions.push({
          examType: {
            $regex:
              `^${escapedExamType}$`,
            $options: "i",
          },
        });
      }

      // ======================================================
      // CLASS
      // ======================================================

      if (
        targetClass &&
        targetClass.toLowerCase() !==
          "all" &&
        targetClass.toLowerCase() !==
          "undefined"
      ) {
        const escapedClass =
          escapeRegex(
            targetClass
          );

        questionConditions.push({
          className: {
            $regex:
              escapedClass,
            $options: "i",
          },
        });
      }

      // ======================================================
      // SUBJECT
      // ======================================================

      if (
        cleanSubject &&
        cleanSubject.toLowerCase() !==
          "all" &&
        cleanSubject.toLowerCase() !==
          "undefined"
      ) {
        const escapedSubject =
          escapeRegex(
            cleanSubject
          );

        questionConditions.push({
          subject: {
            $regex:
              `^${escapedSubject}$`,
            $options: "i",
          },
        });
      }

      const questionQuery = {
        $and:
          questionConditions,
      };

      console.log(
        "=================================================="
      );

      console.log(
        "🔎 MOCK QUESTION FILTER:",
        JSON.stringify(
          questionQuery,
          null,
          2
        )
      );

      // ======================================================
      // FIND EXISTING QUESTIONS
      // ======================================================

      const questions =
        await Question.find(
          questionQuery
        ).sort({
          globalQuestionNumber:
            1,

          questionNumber:
            1,

          createdAt:
            1,
        });

      console.log(
        `🎯 EXISTING MOCK QUESTIONS FOUND: ${questions.length}`
      );

      // ======================================================
      // NO QUESTIONS
      // ======================================================

      if (
        questions.length === 0
      ) {
        return res.status(404).json({
          success: false,

          code:
            "MOCK_QUESTIONS_NOT_FOUND",

          message:
            "No published mock questions were found for the selected class and exam type.",
        });
      }

      // ======================================================
      // EXAM FILTER
      // ======================================================

      const examFilter: any = {
        testCategory:
          "mock",

        status:
          "published",

        isPublished:
          true,
      };

      // ======================================================
      // EXAM TYPE
      // ======================================================

      if (
        cleanExamType &&
        cleanExamType.toLowerCase() !==
          "all" &&
        cleanExamType.toLowerCase() !==
          "undefined"
      ) {
        const escapedExamType =
          escapeRegex(
            cleanExamType
          );

        examFilter.examType = {
          $regex:
            `^${escapedExamType}$`,

          $options:
            "i",
        };
      }

      // ======================================================
      // CLASS
      // ======================================================

      if (
        targetClass &&
        targetClass.toLowerCase() !==
          "all" &&
        targetClass.toLowerCase() !==
          "undefined"
      ) {
        const escapedClass =
          escapeRegex(
            targetClass
          );

        examFilter.className = {
          $regex:
            escapedClass,

          $options:
            "i",
        };
      }

      // ======================================================
      // SUBJECT
      // ======================================================

      if (
        cleanSubject &&
        cleanSubject.toLowerCase() !==
          "all" &&
        cleanSubject.toLowerCase() !==
          "undefined"
      ) {
        const escapedSubject =
          escapeRegex(
            cleanSubject
          );

        examFilter.subject = {
          $regex:
            `^${escapedSubject}$`,

          $options:
            "i",
        };
      }

      console.log(
        "🔎 MOCK EXAM FILTER:",
        JSON.stringify(
          examFilter,
          null,
          2
        )
      );

      // ======================================================
      // FIND EXISTING PUBLISHED MOCK EXAM
      // ======================================================

      let exam =
        await Exam.findOne(
          examFilter
        ).sort({
          createdAt:
            -1,
        });

      // ======================================================
      // LOG MATCH
      // ======================================================

      console.log(
        "🎯 MATCHED MOCK EXAM:",
        exam
          ? {
              _id:
                String(
                  exam._id
                ),

              title:
                exam.title,

              examName:
                exam.examName,

              examType:
                exam.examType,

              className:
                exam.className,

              subject:
                exam.subject,

              testCategory:
                exam.testCategory,

              status:
                exam.status,

              isPublished:
                exam.isPublished,

              questionCount:
                Array.isArray(
                  exam.questions
                )
                  ? exam.questions
                      .length
                  : 0,
            }
          : null
      );

      // ======================================================
      // CREATE REAL EXAM
      // ======================================================
      //
      // IMPORTANT:
      // Existing Questions are NOT duplicated.
      //
      // Only their _id values are stored inside Exam.questions.
      //
      // ======================================================

      if (!exam) {
        console.log(
          "⚠️ No published mock Exam found."
        );

        const questionIds =
          questions.map(
            (question: any) =>
              question._id
          );

        // ====================================================
        // IMPORTANT TYPESCRIPT FIX
        // ====================================================
        //
        // Do NOT access:
        // questions[0].exam
        // questions[0].targetExam
        // questions[0].class
        // questions[0].academicYear
        //
        // Those fields are not part of the current interface.
        //
        // ====================================================

        const firstQuestion: any =
          questions[0];

        const detectedExamType =
          String(
            cleanExamType ||
              firstQuestion?.examType ||
              "NEET"
          )
            .trim()
            .toUpperCase();

        const detectedClass =
          String(
            targetClass ||
              firstQuestion?.className ||
              "2nd PUC"
          ).trim();

        const detectedSubject =
          String(
            cleanSubject ||
              firstQuestion?.subject ||
              ""
          ).trim();

        const examTitle =
          `${detectedClass} ${detectedExamType} Mock Test`;

        // ====================================================
        // REQUIRED EXAM DATES
        // ====================================================

        const startDate =
          new Date();

        const endDate =
          new Date(
            startDate.getTime() +
              180 * 60 * 1000
          );

        const resultReleaseAt =
          new Date();

        resultReleaseAt.setDate(
          resultReleaseAt.getDate() + 1
        );

        resultReleaseAt.setHours(
          9,
          0,
          0,
          0
        );

        console.log(
          `🛠️ Creating REAL Exam using ${questionIds.length} existing question IDs...`
        );

        // ====================================================
        // CREATE REAL MONGODB EXAM
        // ====================================================

        exam =
          await Exam.create({
            title:
              examTitle,

            examName:
              examTitle,

            subject:
              detectedSubject,

            chapter:
              "",

            className:
              detectedClass,

            testCategory:
              "mock",

            examType:
              detectedExamType,

            targetExam:
              detectedExamType,

            // Existing question IDs
            questions:
              questionIds,

            totalQuestions:
              questionIds.length,

            duration:
              180,

            marksPerQuestion:
              4,

            negativeMarks:
              1,

            // REQUIRED FIELDS
            startDate,

            endDate,

            resultReleaseAt,

            createdBy:
              "SYSTEM",

            status:
              "published",

            isPublished:
              true,
          });

        console.log(
          "✅ REAL MOCK EXAM CREATED"
        );

        console.log(
          "✅ REAL EXAM ID:",
          String(
            exam._id
          )
        );

        console.log(
          "✅ LINKED QUESTIONS:",
          questionIds.length
        );
      }

      // ======================================================
      // EXAM SAFETY CHECK
      // ======================================================

      if (
        !exam ||
        !exam._id
      ) {
        return res.status(500).json({
          success: false,

          code:
            "MOCK_EXAM_CREATE_FAILED",

          message:
            "Unable to create or find a mock exam.",
        });
      }

      // ======================================================
      // ENSURE PUBLISHED
      // ======================================================

      if (
        exam.testCategory !==
        "mock"
      ) {
        exam.testCategory =
          "mock";
      }

      if (
        exam.status !==
        "published"
      ) {
        exam.status =
          "published";
      }

      if (
        exam.isPublished !==
        true
      ) {
        exam.isPublished =
          true;
      }

      // ======================================================
      // LINK QUESTIONS WHEN EMPTY
      // ======================================================

      const currentExamQuestionIds =
        Array.isArray(
          exam.questions
        )
          ? exam.questions.map(
              (id: any) =>
                String(id)
            )
          : [];

      if (
        currentExamQuestionIds.length ===
        0
      ) {
        exam.questions =
          questions.map(
            (question: any) =>
              question._id
          );

        exam.totalQuestions =
          questions.length;

        await exam.save();

        console.log(
          "✅ EXISTING EXAM UPDATED WITH QUESTION IDs"
        );
      }

      // ======================================================
      // AUTHORITATIVE QUESTIONS
      // ======================================================

      let finalQuestions: any[] =
        [];

      if (
        Array.isArray(
          exam.questions
        ) &&
        exam.questions.length >
          0
      ) {
        finalQuestions =
          await Question.find({
            _id: {
              $in:
                exam.questions,
            },

            isPublished:
              true,

            $or: [
              {
                testCategory: {
                  $regex:
                    /^mock$/i,
                },
              },

              {
                category: {
                  $regex:
                    /^mock$/i,
                },
              },
            ],
          }).sort({
            globalQuestionNumber:
              1,

            questionNumber:
              1,
          });
      }

      // ======================================================
      // FALLBACK SYNC
      // ======================================================

      if (
        finalQuestions.length ===
        0
      ) {
        console.log(
          "⚠️ Exam has no usable linked questions."
        );

        console.log(
          "🔄 Syncing existing question IDs..."
        );

        exam.questions =
          questions.map(
            (question: any) =>
              question._id
          );

        exam.totalQuestions =
          questions.length;

        exam.testCategory =
          "mock";

        exam.status =
          "published";

        exam.isPublished =
          true;

        await exam.save();

        finalQuestions =
          await Question.find({
            _id: {
              $in:
                exam.questions,
            },

            isPublished:
              true,

            $or: [
              {
                testCategory: {
                  $regex:
                    /^mock$/i,
                },
              },

              {
                category: {
                  $regex:
                    /^mock$/i,
                },
              },
            ],
          }).sort({
            globalQuestionNumber:
              1,

            questionNumber:
              1,
          });
      }

      // ======================================================
      // NO FINAL QUESTIONS
      // ======================================================

      if (
        finalQuestions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          code:
            "MOCK_QUESTIONS_NOT_FOUND",

          message:
            "Mock exam exists, but no published questions are linked to it.",

          examId:
            String(
              exam._id
            ),
        });
      }

      // ======================================================
      // SAFE DISPLAY QUESTIONS
      // ======================================================

      const safeQuestions =
        getDisplayQuestions(
          finalQuestions
        );

      // ======================================================
      // FINAL LOG
      // ======================================================

      console.log(
        "=================================================="
      );

      console.log(
        "✅ MOCK TEST READY"
      );

      console.log(
        "✅ REAL EXAM ID:",
        String(
          exam._id
        )
      );

      console.log(
        "✅ EXAM TYPE:",
        exam.examType
      );

      console.log(
        "✅ CLASS:",
        exam.className
      );

      console.log(
        "✅ TOTAL QUESTIONS:",
        safeQuestions.length
      );

      console.log(
        "=================================================="
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        examId:
          String(
            exam._id
          ),

        testId:
          exam.testId
            ? String(
                exam.testId
              )
            : "",

        total:
          safeQuestions.length,

        exam: {
          _id:
            String(
              exam._id
            ),

          id:
            String(
              exam._id
            ),

          title:
            exam.title ||
            "Mock Test",

          examName:
            exam.examName ||
            exam.title ||
            "Mock Test",

          testCategory:
            "mock",

          examType:
            exam.examType ||
            "NEET",

          targetExam:
            exam.targetExam ||
            exam.examType ||
            "NEET",

          subject:
            exam.subject ||
            "",

          chapter:
            exam.chapter ||
            "",

          className:
            exam.className ||
            "",

          duration:
            safeNumber(
              exam.duration,
              180
            ),

          totalQuestions:
            safeQuestions.length,

          marksPerQuestion:
            safeNumber(
              exam.marksPerQuestion,
              4
            ),

          negativeMarks:
            safeNumber(
              exam.negativeMarks,
              1
            ),
        },

        questions:
          safeQuestions,
      });
    } catch (error: any) {
      console.error(
        "GET MOCK TEST QUESTIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to get mock test questions",
      });
    }
  };

// ============================================================
// START / RESUME MOCK TEST
// ============================================================

export const startMockTest =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const studentId =
        getStudentId(req);

      const {
        examId,
      } = req.body;

      let deviceId =
        getDeviceId(req);

      let deviceSessionId =
        getDeviceSessionId(req);

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        !studentId ||
        !examId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "studentId and examId are required",
        });
      }

      if (
        !isValidObjectId(
          examId
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid examId",
        });
      }

      if (!deviceId) {
        deviceId =
          generateDeviceId();
      }

      // ======================================================
      // FIND PUBLISHED MOCK EXAM
      // ======================================================

      const exam =
        await Exam.findOne({
          _id:
            examId,

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

      // ======================================================
      // QUESTIONS
      // ======================================================

      const questions =
        await Question.find({
          _id: {
            $in:
              exam.questions,
          },

          isPublished:
            true,

          $or: [
            {
              testCategory: {
                $regex:
                  /^mock$/i,
              },
            },

            {
              category: {
                $regex:
                  /^mock$/i,
              },
            },
          ],
        }).sort({
          globalQuestionNumber:
            1,

          questionNumber:
            1,
        });

      if (
        questions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "No published questions found for this mock exam",
        });
      }

      // ======================================================
      // EXISTING SESSION
      // ======================================================

      let session =
        await ExamSession.findOne({
          studentId,

          examId,
        });

      // ======================================================
      // COMPLETED
      // ======================================================

      if (
        session &&
        session.status ===
          "completed"
      ) {
        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          message:
            "This exam has already been submitted and cannot be reopened.",

          sessionId:
            String(
              session._id
            ),
        });
      }

      // ======================================================
      // CREATE SESSION
      // ======================================================

      if (!session) {
        const now =
          new Date();

        const durationSeconds =
          getDurationSeconds(
            exam,
            questions.length
          );

        deviceSessionId =
          deviceSessionId ||
          generateToken();

        session =
          await ExamSession.create({
            studentId,

            examId,

            questions:
              questions.map(
                (q: any) =>
                  q._id
              ),

            answers: [],

            markedForReview:
              {},

            currentQuestion:
              0,

            score:
              0,

            status:
              "started",

            startTime:
              now,

            durationSeconds,

            deviceSessionId,

            deviceId,

            lastActivityAt:
              now,
          });

        return res.status(201).json({
          success: true,

          created:
            true,

          resumed:
            false,

          code:
            "EXAM_STARTED",

          message:
            "Mock exam started successfully.",

          sessionId:
            String(
              session._id
            ),

          deviceSessionId:
            session.deviceSessionId,

          deviceId:
            session.deviceId,

          currentQuestion:
            0,

          remainingSeconds:
            getRemainingSeconds(
              session
            ),

          durationSeconds:
            session.durationSeconds,

          answers:
            [],

          markedForReview:
            {},

          exam: {
            id:
              exam._id,

            _id:
              exam._id,

            title:
              exam.title,

            examName:
              exam.examName ||
              exam.title,

            testCategory:
              "mock",

            examType:
              exam.examType,

            targetExam:
              exam.targetExam,

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
            getDisplayQuestions(
              questions
            ),
        });
      }

      // ======================================================
      // TIMER
      // ======================================================

      if (
        isExpired(
          session
        )
      ) {
        return res.status(410).json({
          success: false,

          code:
            "EXAM_TIME_EXPIRED",

          message:
            "Exam time has expired.",

          sessionId:
            String(
              session._id
            ),

          remainingSeconds:
            0,
        });
      }

      // ======================================================
      // DEVICE CHECK
      // ======================================================

      const oldDeviceId =
        String(
          session.deviceId ||
            ""
        );

      const oldSessionToken =
        String(
          session.deviceSessionId ||
            ""
        );

      const sameDevice =
        Boolean(
          oldDeviceId &&
            deviceId &&
            oldDeviceId ===
              deviceId
        );

      const sameSession =
        Boolean(
          oldSessionToken &&
            deviceSessionId &&
            oldSessionToken ===
              deviceSessionId
        );

      // ======================================================
      // DEVICE TAKEOVER
      // ======================================================

      if (
        !sameDevice &&
        !sameSession
      ) {
        const newToken =
          generateToken();

        session.deviceId =
          deviceId;

        session.deviceSessionId =
          newToken;

        session.lastActivityAt =
          new Date();

        await session.save();

        return res.status(200).json({
          success: true,

          code:
            "SESSION_TAKEN_OVER",

          created:
            false,

          resumed:
            true,

          message:
            "Exam session transferred to this device. Previous device is no longer authorized.",

          sessionId:
            String(
              session._id
            ),

          deviceSessionId:
            newToken,

          deviceId,

          currentQuestion:
            safeNumber(
              session.currentQuestion,
              0
            ),

          remainingSeconds:
            getRemainingSeconds(
              session
            ),

          durationSeconds:
            session.durationSeconds,

          answers:
            session.answers,

          markedForReview:
            session.markedForReview ||
            {},

          exam: {
            id:
              exam._id,

            _id:
              exam._id,

            title:
              exam.title,

            examName:
              exam.examName ||
              exam.title,

            testCategory:
              "mock",

            examType:
              exam.examType,

            targetExam:
              exam.targetExam,

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
            getDisplayQuestions(
              questions
            ),
        });
      }

      // ======================================================
      // NORMAL RESUME
      // ======================================================

      session.lastActivityAt =
        new Date();

      await session.save();

      return res.status(200).json({
        success: true,

        code:
          "EXAM_RESUMED",

        created:
          false,

        resumed:
          true,

        sessionId:
          String(
            session._id
          ),

        deviceSessionId:
          session.deviceSessionId,

        deviceId:
          session.deviceId,

        currentQuestion:
          safeNumber(
            session.currentQuestion,
            0
          ),

        remainingSeconds:
          getRemainingSeconds(
            session
          ),

        durationSeconds:
          session.durationSeconds,

        answers:
          session.answers,

        markedForReview:
          session.markedForReview ||
          {},

        exam: {
          id:
            exam._id,

          _id:
            exam._id,

          title:
            exam.title,

          examName:
            exam.examName ||
            exam.title,

          testCategory:
            "mock",

          examType:
            exam.examType,

          targetExam:
            exam.targetExam,

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
          getDisplayQuestions(
            questions
          ),
      });
    } catch (error: any) {
      console.error(
        "START / RESUME MOCK TEST ERROR:",
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
// SAVE EXAM PROGRESS
// ============================================================

export const saveMockTestProgress =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const studentId =
        getStudentId(req);

      const {
        sessionId,
        answers,
        currentQuestion,
        markedForReview,
      } = req.body;

      if (
        !studentId ||
        !sessionId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "studentId and sessionId are required",
        });
      }

      if (
        !isValidObjectId(
          sessionId
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid sessionId",
        });
      }

      const session =
        await ExamSession.findById(
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          success: false,

          code:
            "SESSION_NOT_FOUND",

          message:
            "Exam session not found",
        });
      }

      if (
        String(
          session.studentId
        ) !==
        String(studentId)
      ) {
        return res.status(403).json({
          success: false,

          code:
            "SESSION_OWNER_MISMATCH",

          message:
            "Invalid exam session owner",
        });
      }

      if (
        session.status ===
        "completed"
      ) {
        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          message:
            "Exam already submitted",
        });
      }

      const incomingToken =
        getDeviceSessionId(
          req
        );

      const incomingDevice =
        getDeviceId(req);

      if (
        incomingToken &&
        incomingToken !==
          String(
            session.deviceSessionId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "This exam is active on another device.",
        });
      }

      if (
        incomingDevice &&
        session.deviceId &&
        incomingDevice !==
          String(
            session.deviceId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "This exam belongs to another device.",
        });
      }

      if (
        isExpired(
          session
        )
      ) {
        return res.status(410).json({
          success: false,

          code:
            "EXAM_TIME_EXPIRED",

          message:
            "Exam time has expired.",

          remainingSeconds:
            0,
        });
      }

      const allowedIds:
        Set<string> =
        new Set(
          session.questions.map(
            (
              id:
                mongoose.Types.ObjectId |
                string
            ) =>
              String(id)
          )
        );

      if (
        Array.isArray(
          answers
        )
      ) {
        session.answers =
          sanitizeAnswers(
            answers,
            allowedIds
          );
      }

      session.markedForReview =
        sanitizeReview(
          markedForReview,
          allowedIds
        );

      let safeCurrent =
        safeNumber(
          currentQuestion,
          session.currentQuestion ||
            0
        );

      safeCurrent =
        Math.max(
          0,
          Math.min(
            safeCurrent,
            Math.max(
              0,
              session.questions
                .length - 1
            )
          )
        );

      session.currentQuestion =
        safeCurrent;

      session.lastActivityAt =
        new Date();

      await session.save();

      return res.status(200).json({
        success: true,

        code:
          "PROGRESS_SAVED",

        sessionId:
          String(
            session._id
          ),

        currentQuestion:
          session.currentQuestion,

        remainingSeconds:
          getRemainingSeconds(
            session
          ),

        answers:
          session.answers,

        markedForReview:
          session.markedForReview,
      });
    } catch (error: any) {
      console.error(
        "SAVE MOCK TEST PROGRESS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to save exam progress",
      });
    }
  };

// ============================================================
// HEARTBEAT
// ============================================================

export const mockTestHeartbeat =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const studentId =
        getStudentId(req);

      const {
        sessionId,
      } = req.body;

      if (
        !studentId ||
        !sessionId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "studentId and sessionId are required",
        });
      }

      const session =
        await ExamSession.findById(
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          success: false,

          code:
            "SESSION_NOT_FOUND",

          message:
            "Exam session not found",
        });
      }

      if (
        String(
          session.studentId
        ) !==
        String(studentId)
      ) {
        return res.status(403).json({
          success: false,

          code:
            "SESSION_OWNER_MISMATCH",
        });
      }

      if (
        session.status ===
        "completed"
      ) {
        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          message:
            "Exam already submitted",
        });
      }

      const token =
        getDeviceSessionId(
          req
        );

      const device =
        getDeviceId(req);

      if (
        token &&
        token !==
          String(
            session.deviceSessionId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "Exam opened on another device. This device is no longer authorized.",
        });
      }

      if (
        device &&
        session.deviceId &&
        device !==
          String(
            session.deviceId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "Another device is using this exam.",
        });
      }

      const remainingSeconds =
        getRemainingSeconds(
          session
        );

      if (
        remainingSeconds <=
        0
      ) {
        return res.status(410).json({
          success: false,

          code:
            "EXAM_TIME_EXPIRED",

          message:
            "Exam time has expired.",

          remainingSeconds:
            0,
        });
      }

      session.lastActivityAt =
        new Date();

      await session.save();

      return res.status(200).json({
        success: true,

        active: true,

        sessionId:
          String(
            session._id
          ),

        remainingSeconds,

        currentQuestion:
          session.currentQuestion,

        deviceSessionId:
          session.deviceSessionId,
      });
    } catch (error: any) {
      console.error(
        "MOCK TEST HEARTBEAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Heartbeat failed",
      });
    }
  };

// ============================================================
// GET EXISTING SESSION
// ============================================================

export const getMockSession =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const studentId =
        getStudentId(req);

      const {
        examId,
      } = req.params;

      if (
        !studentId ||
        !examId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "studentId and examId are required",
        });
      }

      if (
        !isValidObjectId(
          examId
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid examId",
        });
      }

      const session =
        await ExamSession.findOne({
          studentId,

          examId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,

          code:
            "NO_SESSION",

          message:
            "No exam session found",
        });
      }

      if (
        session.status ===
        "completed"
      ) {
        return res.status(200).json({
          success: true,

          submitted:
            true,

          code:
            "EXAM_COMPLETED",

          sessionId:
            String(
              session._id
            ),

          submittedAt:
            session.submittedAt,
        });
      }

      const token =
        getDeviceSessionId(
          req
        );

      const device =
        getDeviceId(req);

      if (
        token &&
        token !==
          String(
            session.deviceSessionId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "This exam is active on another device.",
        });
      }

      if (
        device &&
        session.deviceId &&
        device !==
          String(
            session.deviceId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "Another device is using this exam.",
        });
      }

      if (
        isExpired(
          session
        )
      ) {
        return res.status(410).json({
          success: false,

          code:
            "EXAM_TIME_EXPIRED",

          remainingSeconds:
            0,
        });
      }

      const exam =
        await Exam.findOne({
          _id:
            session.examId,

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

      const questions =
        await Question.find({
          _id: {
            $in:
              session.questions,
          },

          isPublished:
            true,
        }).sort({
          globalQuestionNumber:
            1,

          questionNumber:
            1,
        });

      if (
        questions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "No questions found for this exam session",
        });
      }

      session.lastActivityAt =
        new Date();

      await session.save();

      return res.status(200).json({
        success: true,

        resumed:
          true,

        code:
          "EXAM_RESUMED",

        sessionId:
          String(
            session._id
          ),

        deviceSessionId:
          session.deviceSessionId,

        deviceId:
          session.deviceId,

        currentQuestion:
          session.currentQuestion,

        remainingSeconds:
          getRemainingSeconds(
            session
          ),

        durationSeconds:
          session.durationSeconds,

        answers:
          session.answers,

        markedForReview:
          session.markedForReview ||
          {},

        exam: {
          id:
            exam._id,

          _id:
            exam._id,

          title:
            exam.title,

          examName:
            exam.examName ||
            exam.title,

          subject:
            exam.subject,

          chapter:
            exam.chapter,

          className:
            exam.className,

          examType:
            exam.examType,

          testCategory:
            "mock",

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
          getDisplayQuestions(
            questions
          ),
      });
    } catch (error: any) {
      console.error(
        "GET MOCK SESSION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to get exam session",
      });
    }
  };

// ============================================================
// SUBMIT MOCK TEST
// ============================================================

export const submitMockTest =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {
    try {
      const studentId =
        getStudentId(req);

      const studentName =
        getStudentName(req);

      const {
        sessionId,
        answers,
        warnings,
        autoSubmitted,
      } = req.body;

      if (
        !studentId ||
        !sessionId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "studentId and sessionId are required",
        });
      }

      if (
        !isValidObjectId(
          sessionId
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid sessionId",
        });
      }

      const session =
        await ExamSession.findById(
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          success: false,

          code:
            "SESSION_NOT_FOUND",

          message:
            "Exam session not found",
        });
      }

      if (
        String(
          session.studentId
        ) !==
        String(studentId)
      ) {
        return res.status(403).json({
          success: false,

          code:
            "SESSION_OWNER_MISMATCH",

          message:
            "Invalid exam session owner",
        });
      }

      if (
        session.status ===
        "completed"
      ) {
        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          submitted:
            true,

          message:
            "Mock test already submitted",
        });
      }

      const token =
        getDeviceSessionId(
          req
        );

      const device =
        getDeviceId(req);

      if (
        token &&
        token !==
          String(
            session.deviceSessionId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "This exam is active on another device.",
        });
      }

      if (
        device &&
        session.deviceId &&
        device !==
          String(
            session.deviceId
          )
      ) {
        return res.status(409).json({
          success: false,

          code:
            "SESSION_REPLACED",

          logoutRequired:
            true,

          message:
            "Another device is using this exam.",
        });
      }

      const exam =
        await Exam.findOne({
          _id:
            session.examId,

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

      const remainingSeconds =
        getRemainingSeconds(
          session
        );

      const elapsedSeconds =
        Math.max(
          0,
          safeNumber(
            session.durationSeconds,
            0
          ) -
            remainingSeconds
        );

      const allowedIds:
        Set<string> =
        new Set(
          session.questions.map(
            (
              id:
                mongoose.Types.ObjectId |
                string
            ) =>
              String(id)
          )
        );

      let finalAnswers =
        sanitizeAnswers(
          session.answers,
          allowedIds
        );

      if (
        Array.isArray(
          answers
        )
      ) {
        const latestAnswers =
          sanitizeAnswers(
            answers,
            allowedIds
          );

        const merged =
          new Map<
            string,
            string
          >();

        for (
          const item of
            finalAnswers
        ) {
          merged.set(
            item.questionId,
            item.answer
          );
        }

        for (
          const item of
            latestAnswers
        ) {
          merged.set(
            item.questionId,
            item.answer
          );
        }

        finalAnswers =
          Array.from(
            merged.entries()
          ).map(
            ([
              questionId,
              answer,
            ]) => ({
              questionId,
              answer,
            })
          );
      }

      const answerMap =
        new Map<
          string,
          string
        >();

      for (
        const item of
          finalAnswers
      ) {
        answerMap.set(
          item.questionId,
          item.answer
        );
      }

      const questions =
        await Question.find({
          _id: {
            $in:
              session.questions,
          },
        }).sort({
          globalQuestionNumber:
            1,

          questionNumber:
            1,
        });

      if (
        questions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Questions not found",
        });
      }

      const marksPerQuestion =
        Math.max(
          0,
          safeNumber(
            exam.marksPerQuestion,
            4
          )
        );

      const negativeMarks =
        Math.max(
          0,
          safeNumber(
            exam.negativeMarks,
            1
          )
        );

      let correctAnswers =
        0;

      let wrongAnswers =
        0;

      let attemptedQuestions =
        0;

      let unansweredQuestions =
        0;

      let marks =
        0;

      const review:
        any[] = [];

      // ======================================================
      // SERVER SCORING
      // ======================================================

      for (
        const question of
          questions
      ) {
        const questionId =
          String(
            question._id
          );

        const selectedAnswer =
          normalizeAnswer(
            answerMap.get(
              questionId
            ) || ""
          );

        const correctAnswer =
          normalizeAnswer(
            question.correctAnswer ||
              ""
          );

        if (
          selectedAnswer ===
          ""
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

        attemptedQuestions++;

        if (
          sameAnswer(
            selectedAnswer,
            correctAnswer
          )
        ) {
          correctAnswers++;

          marks +=
            marksPerQuestion;

          review.push({
            questionId:
              question._id,

            question:
              question.question,

            selectedAnswer,

            correctAnswer:
              question.correctAnswer,

            isCorrect:
              true,

            marks:
              marksPerQuestion,

            result:
              "correct",
          });
        } else {
          wrongAnswers++;

          marks -=
            negativeMarks;

          review.push({
            questionId:
              question._id,

            question:
              question.question,

            selectedAnswer,

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

      // ======================================================
      // TOTAL
      // ======================================================

      const totalQuestions =
        session.questions
          .length;

      const maxMarks =
        totalQuestions *
        marksPerQuestion;

      // ======================================================
      // FINAL MARKS
      // ======================================================

      const finalMarks =
        Math.max(
          0,
          Number(
            marks.toFixed(2)
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

      const grade =
        getGrade(
          percentage
        );

      // ======================================================
      // STATUS
      // ======================================================

      const status =
        getResultStatus(
          percentage
        );

      // ======================================================
      // RESULT AVAILABLE
      // ======================================================

      const resultAvailableAt =
        getResultAvailableAt();

      // ======================================================
      // TIME TAKEN
      // ======================================================

      const timeTaken =
        Math.max(
          0,
          Math.ceil(
            elapsedSeconds /
              60
          )
        );

      // ======================================================
      // WARNING COUNT
      // ======================================================

      const warningCount =
        Math.max(
          0,
          safeNumber(
            warnings,
            0
          )
        );

      // ======================================================
      // ATOMIC COMPLETE
      // ======================================================

      const completedSession =
        await ExamSession.findOneAndUpdate(
          {
            _id:
              session._id,

            studentId,

            status:
              "started",

            deviceSessionId:
              session.deviceSessionId,
          },
          {
            $set: {
              answers:
                finalAnswers,

              score:
                finalMarks,

              status:
                "completed",

              endTime:
                new Date(),

              submittedAt:
                new Date(),

              lastActivityAt:
                new Date(),
            },
          },
          {
            new: true,
          }
        );

      if (
        !completedSession
      ) {
        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          submitted:
            true,

          message:
            "Exam has already been submitted.",
        });
      }

      // ======================================================
      // EXISTING RESULT
      // ======================================================

      let result =
        await Result.findOne({
          studentId,

          examId:
            session.examId,

          testCategory:
            "mock",
        });

      // ======================================================
      // CREATE RESULT
      // ======================================================

      if (!result) {
        result =
          await Result.create({
            studentId,

            studentName:
              studentName || "",

            examId:
              session.examId,

            examName:
              exam.examName ||
              exam.title ||
              "Mock Test",

            testCategory:
              "mock",

            subject:
              exam.subject ||
              "General",

            chapter:
              exam.chapter ||
              "",

            className:
              exam.className ||
              "",

            examType:
              exam.examType ||
              "MOCK",

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

            timeTaken,

            warnings:
              warningCount,

            autoSubmitted:
              Boolean(
                autoSubmitted
              ),

            rank:
              0,

            resultAvailableAt,

            isResultPublished:
              false,

            review,
          });
      }

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(201).json({
        success: true,

        submitted:
          true,

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

          autoSubmitted:
            result.autoSubmitted,

          resultAvailableAt:
            result.resultAvailableAt,

          isResultPublished:
            result.isResultPublished,

          review:
            result.review,
        },

        examSession: {
          sessionId:
            completedSession._id,

          status:
            completedSession.status,

          startTime:
            completedSession.startTime,

          endTime:
            completedSession.endTime,

          submittedAt:
            completedSession.submittedAt,
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
// EXPORT
// ============================================================

export default {
  getMockTestQuestions,
  startMockTest,
  saveMockTestProgress,
  mockTestHeartbeat,
  getMockSession,
  submitMockTest,
};