import {
  Request,
  Response,
} from "express";

import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";

// ============================================================
// GET SUBJECT EXAM
// ============================================================

export const getSubjectExam =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const { id } =
        req.params;

      console.log(
        "======================================"
      );

      console.log(
        "📘 GET SUBJECT EXAM"
      );

      console.log(
        "TEST ID:",
        id
      );

      console.log(
        "======================================"
      );

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Subject exam ID required",
        });
      }

      // ======================================================
      // FIND QUESTIONS BY CUSTOM TEST ID
      // ======================================================

      const questions =
        await QuestionBank.find({
          testId: String(id),
          isPublished: true,
        }).sort({
          questionNumber: 1,
        });

      console.log(
        "📚 SUBJECT EXAM QUESTIONS:",
        questions.length
      );

      // ======================================================
      // NOT FOUND
      // ======================================================

      if (
        questions.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Subject exam not found",
        });
      }

      // ======================================================
      // FIRST QUESTION
      // ======================================================

      const firstQuestion: any =
        questions[0];

      const testTitle =
        String(
          firstQuestion?.testTitle ||
            ""
        ).trim() ||
        "Physics Subject Test";

      const subject =
        String(
          firstQuestion?.subject ||
            ""
        ).trim();

      const academicYear =
        String(
          firstQuestion?.academicYear ||
            ""
        ).trim();

      const examType =
        String(
          firstQuestion?.examType ||
            "NEET"
        ).trim();

      const testCategory =
        String(
          firstQuestion?.testCategory ||
            "subject"
        )
          .trim()
          .toLowerCase();

      // ======================================================
      // FORMAT QUESTIONS
      // ======================================================

      const formattedQuestions =
        questions.map(
          (
            question: any,
            index: number
          ) => ({
            _id:
              question._id,

            questionId:
              question._id,

            questionNumber:
              question.questionNumber ||
              index + 1,

            question:
              question.question,

            options:
              Array.isArray(
                question.options
              )
                ? question.options
                : [],

            subject:
              question.subject,

            chapter:
              question.chapter,

            imageUrl:
              question.imageUrl ||
              "",

            testId:
              question.testId,

            testTitle:
              question.testTitle,

            academicYear:
              question.academicYear,

            examType:
              question.examType,

            testCategory:
              question.testCategory,
          })
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        message:
          "Subject exam loaded successfully",

        exam: {
          id: id,

          testId: id,

          title:
            testTitle,

          testTitle:
            testTitle,

          subject:
            subject,

          academicYear:
            academicYear,

          examType:
            examType,

          testCategory:
            testCategory,

          duration: 180,

          totalQuestions:
            questions.length,
        },

        questions:
          formattedQuestions,

        total:
          questions.length,
      });
    } catch (error: any) {
      console.error(
        "GET SUBJECT EXAM ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to load subject exam",
      });
    }
  };

// ============================================================
// START SUBJECT EXAM
// ============================================================

export const startSubjectExam =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const {
        studentId,
        examId,
      } = req.body;

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

      console.log(
        "======================================"
      );

      console.log(
        "🚀 START SUBJECT EXAM"
      );

      console.log(
        "TEST ID:",
        examId
      );

      console.log(
        "STUDENT ID:",
        studentId
      );

      console.log(
        "======================================"
      );

      // ======================================================
      // FIND QUESTIONS
      // ======================================================

      const questions =
        await QuestionBank.find({
          testId:
            String(examId),

          isPublished: true,
        }).sort({
          questionNumber: 1,
        });

      // ======================================================
      // QUESTIONS NOT FOUND
      // ======================================================

      if (
        questions.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Subject exam questions not found",
        });
      }

      // ======================================================
      // FIRST QUESTION
      // ======================================================

      const firstQuestion: any =
        questions[0];

      const testTitle =
        String(
          firstQuestion?.testTitle ||
            "Physics Subject Test"
        ).trim();

      const subject =
        String(
          firstQuestion?.subject ||
            "Physics"
        ).trim();

      const examType =
        String(
          firstQuestion?.examType ||
            "NEET"
        ).trim();

      const academicYear =
        String(
          firstQuestion?.academicYear ||
            ""
        ).trim();

      // ======================================================
      // CREATE SESSION
      // ======================================================

      const session =
        await ExamSession.create({
          studentId:
            String(studentId),

          // IMPORTANT
          // Subject exam uses custom testId
          testId:
            String(examId),

          questions:
            questions.map(
              (
                question: any
              ) =>
                question._id
            ),

          answers: [],

          score: 0,

          status:
            "started",

          startTime:
            new Date(),
        });

      // ======================================================
      // DISPLAY QUESTIONS
      // ======================================================

      const displayQuestions =
        questions.map(
          (
            question: any,
            index: number
          ) => ({
            _id:
              question._id,

            questionId:
              question._id,

            questionNumber:
              question.questionNumber ||
              index + 1,

            question:
              question.question,

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
              question.subject,

            chapter:
              question.chapter,

            imageUrl:
              question.imageUrl ||
              "",
          })
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(200).json({
        success: true,

        message:
          `${subject} subject exam started`,

        sessionId:
          session._id,

        exam: {
          id:
            examId,

          testId:
            examId,

          title:
            testTitle,

          subject:
            subject,

          examType:
            examType,

          academicYear:
            academicYear,

          testCategory:
            "subject",

          totalQuestions:
            questions.length,

          duration:
            180,
        },

        questions:
          displayQuestions,
      });
    } catch (error: any) {
      console.error(
        "START SUBJECT EXAM ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to start subject exam",
      });
    }
  };

// ============================================================
// SUBMIT SUBJECT EXAM
// ============================================================

export const submitSubjectExam =
  async (
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

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        !studentId ||
        !sessionId ||
        !Array.isArray(
          answers
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "StudentId, SessionId and Answers required",
        });
      }

      // ======================================================
      // FIND SESSION
      // ======================================================

      const session =
        await ExamSession.findById(
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          success: false,

          message:
            "Subject exam session not found",
        });
      }

      // ======================================================
      // SESSION OWNER
      // ======================================================

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

      // ======================================================
      // DOUBLE SUBMISSION
      // ======================================================

      if (
        session.status ===
        "completed"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Exam already submitted",
        });
      }

      // ======================================================
      // GET TEST ID
      // ======================================================

      const testId =
        String(
          session.testId ||
            ""
        ).trim();

      if (!testId) {
        return res.status(400).json({
          success: false,

          message:
            "Subject exam testId missing from session",
        });
      }

      // ======================================================
      // FIND QUESTIONS
      // ======================================================

      const questions =
        await QuestionBank.find({
          _id: {
            $in:
              session.questions,
          },

          isPublished:
            true,
        }).sort({
          questionNumber: 1,
        });

      if (
        questions.length === 0
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Subject exam questions not found",
        });
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
              item.answer ||
                ""
            ).trim()
          );
        }
      }

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

      let marks = 0;

      const review: any[] =
        [];

      // ======================================================
      // CHECK ANSWERS
      // ======================================================

      for (
        const question of questions
      ) {
        const selectedAnswer =
          answerMap.get(
            String(
              question._id
            )
          ) || "";

        const correctAnswer =
          String(
            question.correctAnswer ||
              ""
          ).trim();

        // ====================================================
        // UNANSWERED
        // ====================================================

        if (
          selectedAnswer === ""
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
          });

          continue;
        }

        // ====================================================
        // ATTEMPTED
        // ====================================================

        attemptedQuestions++;

        const isCorrect =
          selectedAnswer ===
          correctAnswer;

        if (isCorrect) {
          correctAnswers++;

          marks += 1;
        } else {
          wrongAnswers++;
        }

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer:
            selectedAnswer,

          correctAnswer:
            question.correctAnswer,

          isCorrect:
            isCorrect,

          marks:
            isCorrect
              ? 1
              : 0,
        });
      }

      // ======================================================
      // TOTAL
      // ======================================================

      const totalQuestions =
        questions.length;

      // ======================================================
      // PERCENTAGE
      // ======================================================

      const percentage =
        totalQuestions > 0
          ? Number(
              (
                (marks /
                  totalQuestions) *
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
        percentage >= 90
      )
        grade = "A+";
      else if (
        percentage >= 80
      )
        grade = "A";
      else if (
        percentage >= 70
      )
        grade = "B";
      else if (
        percentage >= 60
      )
        grade = "C";
      else if (
        percentage >= 50
      )
        grade = "D";

      // ======================================================
      // STATUS
      // ======================================================

      const status =
        percentage >= 40
          ? "PASS"
          : "FAIL";

      // ======================================================
      // TEST TITLE / SUBJECT
      // ======================================================

      const firstQuestion: any =
        questions[0];

      const subject =
        String(
          firstQuestion?.subject ||
            "Physics"
        ).trim();

      const testTitle =
        String(
          firstQuestion?.testTitle ||
            "Physics Subject Test"
        ).trim();

      const academicYear =
        String(
          firstQuestion?.academicYear ||
            ""
        ).trim();

      const examType =
        String(
          firstQuestion?.examType ||
            "NEET"
        ).trim();

      // ======================================================
      // CREATE RESULT
      // ======================================================

      const result =
        await Result.create({
          studentId:
            String(studentId),

          studentName:
            studentName ||
            "",

          // IMPORTANT:
          // custom testId is stored as string
          examId:
            testId,

          examName:
            testTitle,

          testCategory:
            "subject",

          subject:
            subject,

          totalQuestions:
            totalQuestions,

          attemptedQuestions:
            attemptedQuestions,

          unansweredQuestions:
            unansweredQuestions,

          correctAnswers:
            correctAnswers,

          wrongAnswers:
            wrongAnswers,

          marks:
            marks,

          percentage:
            percentage,

          grade:
            grade,

          status:
            status,

          timeTaken:
            Number(
              timeTaken
            ) || 0,

          warnings:
            Number(
              warnings
            ) || 0,

          rank:
            0,

          resultAvailableAt:
            new Date(),

          isResultPublished:
            true,

          review:
            review,
        });

      // ======================================================
      // UPDATE SESSION
      // ======================================================

      session.answers =
        answers.map(
          (
            item: any
          ) => ({
            questionId:
              String(
                item.questionId
              ),

            answer:
              String(
                item.answer ||
                  ""
              ),
          })
        );

      session.score =
        marks;

      session.status =
        "completed";

      session.endTime =
        new Date();

      await session.save();

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(201).json({
        success: true,

        message:
          `${subject} subject exam submitted successfully`,

        result: {
          id:
            result._id,

          examId:
            result.examId,

          examName:
            result.examName,

          testCategory:
            result.testCategory,

          subject:
            result.subject,

          academicYear:
            academicYear,

          examType:
            examType,

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
            result.isResultPublished,

          review:
            result.review,
        },
      });
    } catch (error: any) {
      console.error(
        "SUBMIT SUBJECT EXAM ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to submit subject exam",
      });
    }
  };