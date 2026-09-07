
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
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
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

  if (
    durationMinutes > 0
  ) {
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

const getDisplayQuestions = (
  questions: any[]
): any[] => {
  return questions.map(
    (question: any) => ({
      questionId:
        String(
          question._id
        ),

      questionNumber:
        question.questionNumber,

      question:
        question.question,

      options:
        Array.isArray(
          question.options
        )
          ? question.options
          : [],

      subject:
        question.subject ||
        "",

      chapter:
        question.chapter ||
        "",

      imageUrl:
        question.imageUrl ||
        "",
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

  if (
    !Array.isArray(answers)
  ) {
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
      ).trim();

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
  if (
    percentage >= 90
  ) {
    return "A+";
  }

  if (
    percentage >= 80
  ) {
    return "A";
  }

  if (
    percentage >= 70
  ) {
    return "B";
  }

  if (
    percentage >= 60
  ) {
    return "C";
  }

  if (
    percentage >= 50
  ) {
    return "D";
  }

  return "F";
};

// ============================================================
// PASS / FAIL
// ============================================================

const getResultStatus = (
  percentage: number
): "PASS" | "FAIL" => {
  return percentage >= 40
    ? "PASS"
    : "FAIL";
};

// ============================================================
// RESULT AVAILABLE
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
// EXAM RESPONSE
// ============================================================

const buildExamResponse = (
  exam: any,
  questionCount: number
) => {
  return {
    id:
      exam._id,

    _id:
      exam._id,

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
      "Full Assessment",

    className:
      exam.className ||
      "",

    duration:
      safeNumber(
        exam.duration,
        180
      ),

    totalQuestions:
      questionCount,

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
  };
};

// ============================================================
// GET MOCK TEST QUESTIONS
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
        chapter,
        chapterName,
      } = req.query;

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
          subject ||
            ""
        ).trim();

      const cleanChapter =
        String(
          chapterName ||
            chapter ||
            ""
        ).trim();

      const questionConditions: any[] =
        [
          {
            isPublished:
              true,
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

      if (
        cleanExamType &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanExamType.toLowerCase()
        )
      ) {
        questionConditions.push({
          examType: {
            $regex:
              `^${escapeRegex(
                cleanExamType
              )}$`,
            $options:
              "i",
          },
        });
      }

      if (
        targetClass &&
        ![
          "all",
          "undefined",
        ].includes(
          targetClass.toLowerCase()
        )
      ) {
        questionConditions.push({
          className: {
            $regex:
              escapeRegex(
                targetClass
              ),
            $options:
              "i",
          },
        });
      }

      if (
        cleanSubject &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanSubject.toLowerCase()
        )
      ) {
        questionConditions.push({
          subject: {
            $regex:
              `^${escapeRegex(
                cleanSubject
              )}$`,
            $options:
              "i",
          },
        });
      }

      if (
        cleanChapter &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanChapter.toLowerCase()
        )
      ) {
        questionConditions.push({
          $or: [
            {
              chapter: {
                $regex:
                  `^${escapeRegex(
                    cleanChapter
                  )}$`,
                $options:
                  "i",
              },
            },

            {
              chapterName: {
                $regex:
                  `^${escapeRegex(
                    cleanChapter
                  )}$`,
                $options:
                  "i",
              },
            },
          ],
        });
      }

      const questions =
        await Question.find({
          $and:
            questionConditions,
        }).sort({
          globalQuestionNumber:
            1,

          questionNumber:
            1,

          createdAt:
            1,
        });

      if (
        questions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          code:
            "MOCK_QUESTIONS_NOT_FOUND",

          message:
            "No published mock questions were found.",
        });
      }

      const examFilter: any = {
        testCategory:
          "mock",

        status:
          "published",

        isPublished:
          true,
      };

      if (
        cleanExamType &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanExamType.toLowerCase()
        )
      ) {
        examFilter.examType = {
          $regex:
            `^${escapeRegex(
              cleanExamType
            )}$`,

          $options:
            "i",
        };
      }

      if (
        targetClass &&
        ![
          "all",
          "undefined",
        ].includes(
          targetClass.toLowerCase()
        )
      ) {
        examFilter.className = {
          $regex:
            escapeRegex(
              targetClass
            ),

          $options:
            "i",
        };
      }

      if (
        cleanSubject &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanSubject.toLowerCase()
        )
      ) {
        examFilter.subject = {
          $regex:
            `^${escapeRegex(
              cleanSubject
            )}$`,

          $options:
            "i",
        };
      }

      if (
        cleanChapter &&
        ![
          "all",
          "undefined",
        ].includes(
          cleanChapter.toLowerCase()
        )
      ) {
        examFilter.$or = [
          {
            chapter: {
              $regex:
                `^${escapeRegex(
                  cleanChapter
                )}$`,

              $options:
                "i",
            },
          },

          {
            chapterName: {
              $regex:
                `^${escapeRegex(
                  cleanChapter
                )}$`,

              $options:
                "i",
            },
          },
        ];
      }

      let exam =
        await Exam.findOne(
          examFilter
        ).sort({
          createdAt:
            -1,
        });

      if (!exam) {
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
              "General"
          ).trim();

        const detectedChapter =
          String(
            cleanChapter ||
              firstQuestion?.chapter ||
              firstQuestion?.chapterName ||
              "Full Assessment"
          ).trim();

        const examTitle =
          [
            detectedClass,
            detectedExamType,
            "Mock Test",
            detectedChapter,
          ]
            .filter(Boolean)
            .join(" ");

        const startDate =
          new Date();

        const endDate =
          new Date(
            startDate.getTime() +
              180 *
                60 *
                1000
          );

        const resultReleaseAt =
          getResultAvailableAt();

        exam =
          await Exam.create({
            title:
              examTitle,

            examName:
              examTitle,

            subject:
              detectedSubject,

            chapter:
              detectedChapter,

            className:
              detectedClass,

            testCategory:
              "mock",

            examType:
              detectedExamType,

            targetExam:
              detectedExamType,

            questions:
              questions.map(
                (question: any) =>
                  question._id
              ),

            totalQuestions:
              questions.length,

            duration:
              180,

            marksPerQuestion:
              4,

            negativeMarks:
              1,

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
      }

      const linkedIds =
        Array.isArray(
          exam.questions
        )
          ? exam.questions.map(
              (id: any) =>
                String(id)
            )
          : [];

      if (
        linkedIds.length ===
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
      }

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

      if (
        finalQuestions.length ===
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

      if (
        finalQuestions.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          code:
            "MOCK_QUESTIONS_NOT_FOUND",

          message:
            "Mock exam exists, but no published questions are linked.",
        });
      }

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
          finalQuestions.length,

        exam:
          buildExamResponse(
            exam,
            finalQuestions.length
          ),

        questions:
          getDisplayQuestions(
            finalQuestions
          ),
      });
    } catch (error: any) {
      console.error(
        "GET MOCK TEST QUESTIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to get mock test questions",
      });
    }
  };

// ============================================================
// START / RESUME
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

      let session =
        await ExamSession.findOne({
          studentId,
          examId,
        });

      // ======================================================
      // ALREADY SUBMITTED
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

          submitted:
            true,

          message:
            "This exam has already been submitted and cannot be reopened.",

          sessionId:
            String(
              session._id
            ),
        });
      }

      // ======================================================
      // CREATE
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
                (question: any) =>
                  question._id
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

          exam:
            buildExamResponse(
              exam,
              questions.length
            ),

          questions:
            getDisplayQuestions(
              questions
            ),
        });
      }

      // ======================================================
      // EXPIRED
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
      // DEVICE
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
      // TAKEOVER
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
            session.answers ||
            [],

          markedForReview:
            session.markedForReview ||
            {},

          exam:
            buildExamResponse(
              exam,
              questions.length
            ),

          questions:
            getDisplayQuestions(
              questions
            ),
        });
      }

      // ======================================================
      // RESUME
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
          session.answers ||
          [],

        markedForReview:
          session.markedForReview ||
          {},

        exam:
          buildExamResponse(
            exam,
            questions.length
          ),

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
          error?.message ||
          "Failed to start mock test",
      });
    }
  };

// ============================================================
// SAVE PROGRESS
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
        String(
          studentId
        )
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

      const allowedIds =
        new Set<string>(
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

      if (
        markedForReview !==
        undefined
      ) {
        session.markedForReview =
          sanitizeReview(
            markedForReview,
            allowedIds
          );
      }

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
          session.markedForReview ||
          {},
      });
    } catch (error: any) {
      console.error(
        "SAVE MOCK TEST PROGRESS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
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
        String(
          studentId
        )
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

        active:
          true,

        sessionId:
          String(
            session._id
          ),

        remainingSeconds,

        currentQuestion:
          safeNumber(
            session.currentQuestion,
            0
          ),

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
          error?.message ||
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
          session.answers ||
          [],

        markedForReview:
          session.markedForReview ||
          {},

        exam:
          buildExamResponse(
            exam,
            questions.length
          ),

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
          error?.message ||
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

      // ======================================================
      // VALIDATION
      // ======================================================

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

      // ======================================================
      // OWNER
      // ======================================================

      if (
        String(
          session.studentId
        ) !==
        String(
          studentId
        )
      ) {
        return res.status(403).json({
          success: false,

          code:
            "SESSION_OWNER_MISMATCH",

          message:
            "Invalid exam session owner",
        });
      }

      // ======================================================
      // DEVICE
      // ======================================================

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

      // ======================================================
      // ALREADY SUBMITTED
      // ======================================================

      if (
        session.status ===
        "completed"
      ) {
        const existingResult =
          await Result.findOne({
            studentId,

            examId:
              session.examId,

            testCategory:
              "mock",
          });

        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          submitted:
            true,

          message:
            "Mock test already submitted",

          result:
            existingResult
              ? {
                  id:
                    existingResult._id,

                  examId:
                    existingResult.examId,

                  examName:
                    existingResult.examName,

                  testCategory:
                    existingResult.testCategory,

                  examType:
                    existingResult.examType,

                  subject:
                    existingResult.subject,

                  chapter:
                    existingResult.chapter,

                  className:
                    existingResult.className,

                  totalQuestions:
                    existingResult.totalQuestions,

                  attemptedQuestions:
                    existingResult.attemptedQuestions,

                  unansweredQuestions:
                    existingResult.unansweredQuestions,

                  correctAnswers:
                    existingResult.correctAnswers,

                  wrongAnswers:
                    existingResult.wrongAnswers,

                  marks:
                    existingResult.marks,

                  maxMarks:
                    existingResult.maxMarks,

                  marksPerQuestion:
                    existingResult.marksPerQuestion,

                  negativeMarks:
                    existingResult.negativeMarks,

                  percentage:
                    existingResult.percentage,

                  grade:
                    existingResult.grade,

                  status:
                    existingResult.status,

                  timeTaken:
                    existingResult.timeTaken,

                  warnings:
                    existingResult.warnings,

                  autoSubmitted:
                    existingResult.autoSubmitted,

                  resultAvailableAt:
                    existingResult.resultAvailableAt,

                  isResultPublished:
                    existingResult.isResultPublished,

                  review:
                    existingResult.isResultPublished
                      ? existingResult.review
                      : [],
                }
              : undefined,
        });
      }

      // ======================================================
      // EXAM
      // ======================================================

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

      // ======================================================
      // SERVER TIME
      // ======================================================

      const remainingSeconds =
        getRemainingSeconds(
          session
        );

      const durationSeconds =
        Math.max(
          0,
          safeNumber(
            session.durationSeconds,
            0
          )
        );

      const elapsedSeconds =
        Math.max(
          0,
          durationSeconds -
            remainingSeconds
        );

      const finalAutoSubmitted =
        Boolean(
          autoSubmitted
        ) ||
        remainingSeconds <= 0;

      // ======================================================
      // ALLOWED IDS
      // ======================================================

      const allowedIds =
        new Set<string>(
          session.questions.map(
            (
              id:
                mongoose.Types.ObjectId |
                string
            ) =>
              String(id)
          )
        );

      // ======================================================
      // MERGE ANSWERS
      // ======================================================

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

      // ======================================================
      // ANSWER MAP
      // ======================================================

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

      // ======================================================
      // QUESTIONS
      // ======================================================

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

      // ======================================================
      // MARKING CONFIG
      // ======================================================

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

        const rawCorrectAnswer =
          normalizeAnswer(
            question.correctAnswer
          );

        // ====================================================
        // UNANSWERED
        // ====================================================

        if (
          selectedAnswer ===
          ""
        ) {
          unansweredQuestions++;

          review.push({
            questionId:
              question._id,

            question:
              question.question ||
              "Question",

            selectedAnswer:
              "Not Attempted",

            correctAnswer:
              rawCorrectAnswer ||
              "Not Available",

            isCorrect:
              false,

            marks:
              0,

            result:
              "unanswered",
          });

          continue;
        }

        // ====================================================
        // ATTEMPTED
        // ====================================================

        attemptedQuestions++;

        // ====================================================
        // MISSING ANSWER KEY
        // ====================================================

        if (
          rawCorrectAnswer ===
          ""
        ) {
          review.push({
            questionId:
              question._id,

            question:
              question.question ||
              "Question",

            selectedAnswer:
              selectedAnswer ||
              "Not Attempted",

            correctAnswer:
              "Not Available",

            isCorrect:
              false,

            marks:
              0,

            result:
              "not_evaluated",
          });

          continue;
        }

        // ====================================================
        // CORRECT
        // ====================================================

        if (
          sameAnswer(
            selectedAnswer,
            rawCorrectAnswer
          )
        ) {
          correctAnswers++;

          marks +=
            marksPerQuestion;

          review.push({
            questionId:
              question._id,

            question:
              question.question ||
              "Question",

            selectedAnswer,

            correctAnswer:
              rawCorrectAnswer,

            isCorrect:
              true,

            marks:
              marksPerQuestion,

            result:
              "correct",
          });
        }

        // ====================================================
        // WRONG
        // ====================================================

        else {
          wrongAnswers++;

          marks -=
            negativeMarks;

          review.push({
            questionId:
              question._id,

            question:
              question.question ||
              "Question",

            selectedAnswer,

            correctAnswer:
              rawCorrectAnswer,

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
        session.questions.length;

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

      const grade =
        getGrade(
          percentage
        );

      const status =
        getResultStatus(
          percentage
        );

      const resultAvailableAt =
        getResultAvailableAt();

      const timeTaken =
        Math.max(
          0,
          Math.ceil(
            elapsedSeconds /
              60
          )
        );

      const warningCount =
        Math.max(
          0,
          safeNumber(
            warnings,
            0
          )
        );

      // ======================================================
      // RESULT PAYLOAD
      // ======================================================

      const resultPayload = {
        studentId,

        studentName:
          studentName ||
          "Student",

        examId:
          session.examId,

        examName:
          exam.examName ||
          exam.title ||
          "Mock Test",

        testCategory:
          "mock",

        examType:
          exam.examType ||
          "NEET",

        subject:
          exam.subject ||
          "General",

        chapter:
          normalizeAnswer(
            exam.chapter
          ) ||
          "Full Assessment",

        className:
          normalizeAnswer(
            exam.className
          ) ||
          "",

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
          finalAutoSubmitted,

        rank:
          0,

        resultAvailableAt,

        isResultPublished:
          false,

        review,
      };

      // ======================================================
      // CREATE / REUSE RESULT
      // ======================================================

      let result =
        await Result.findOne({
          studentId,

          examId:
            session.examId,

          testCategory:
            "mock",
        });

      if (!result) {
        result =
          await Result.create(
            resultPayload
          );
      }

      // ======================================================
      // COMPLETE SESSION
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
        const existingResult =
          await Result.findOne({
            studentId,

            examId:
              session.examId,

            testCategory:
              "mock",
          });

        return res.status(409).json({
          success: false,

          code:
            "EXAM_ALREADY_SUBMITTED",

          submitted:
            true,

          message:
            "Exam has already been submitted.",

          result:
            existingResult
              ? {
                  id:
                    existingResult._id,

                  examId:
                    existingResult.examId,

                  examName:
                    existingResult.examName,

                  testCategory:
                    existingResult.testCategory,

                  examType:
                    existingResult.examType,

                  subject:
                    existingResult.subject,

                  chapter:
                    existingResult.chapter,

                  className:
                    existingResult.className,

                  totalQuestions:
                    existingResult.totalQuestions,

                  attemptedQuestions:
                    existingResult.attemptedQuestions,

                  unansweredQuestions:
                    existingResult.unansweredQuestions,

                  correctAnswers:
                    existingResult.correctAnswers,

                  wrongAnswers:
                    existingResult.wrongAnswers,

                  marks:
                    existingResult.marks,

                  maxMarks:
                    existingResult.maxMarks,

                  marksPerQuestion:
                    existingResult.marksPerQuestion,

                  negativeMarks:
                    existingResult.negativeMarks,

                  percentage:
                    existingResult.percentage,

                  grade:
                    existingResult.grade,

                  status:
                    existingResult.status,

                  timeTaken:
                    existingResult.timeTaken,

                  warnings:
                    existingResult.warnings,

                  autoSubmitted:
                    existingResult.autoSubmitted,

                  resultAvailableAt:
                    existingResult.resultAvailableAt,

                  isResultPublished:
                    existingResult.isResultPublished,

                  review:
                    existingResult.isResultPublished
                      ? existingResult.review
                      : [],
                }
              : undefined,
        });
      }

      // ======================================================
      // SUCCESS
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
            result.isResultPublished
              ? result.review
              : [],
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

      /*
       * Never expose raw Mongoose validation details
       * to the student.
       */
      return res.status(500).json({
        success: false,

        code:
          "MOCK_TEST_SUBMIT_FAILED",

        message:
          "Unable to submit the exam right now. Please try again.",
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
