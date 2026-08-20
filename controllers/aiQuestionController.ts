import { Request, Response } from "express";

import QuestionBank from "../models/questionModel";

import {
  verifyQuestionWithAI,
  verifyQuestionsWithAI,
} from "../services/groqQuestionVerifier";

// ============================================================
// 1. VERIFY SINGLE QUESTION
// POST /api/ai/questions/:id/verify
// ============================================================

export const verifySingleQuestion =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Question ID is required",
        });

        return;
      }

      const question =
        await QuestionBank.findById(id);

      if (!question) {
        res.status(404).json({
          success: false,
          message: "Question not found",
        });

        return;
      }

      // ======================================================
      // AI VERIFICATION
      // ======================================================

      const result =
        await verifyQuestionWithAI(id);

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(200).json({
        success: true,

        message:
          "Question AI verification completed",

        questionId: id,

        aiStatus:
          result.aiStatus,

        aiVerified: true,

        aiIssues:
          result.aiIssues,

        aiExplanation:
          result.aiExplanation,
      });

    } catch (error: any) {
      console.error(
        "VERIFY SINGLE QUESTION ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "AI verification failed",
      });
    }
  };

// ============================================================
// 2. VERIFY MULTIPLE QUESTIONS
// POST /api/ai/questions/verify
// ============================================================

export const verifyMultipleQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { questionIds } =
        req.body;

      // ======================================================
      // VALIDATE IDS
      // ======================================================

      if (
        !Array.isArray(
          questionIds
        ) ||
        questionIds.length === 0
      ) {
        res.status(400).json({
          success: false,

          message:
            "questionIds array is required",
        });

        return;
      }

      // ======================================================
      // VERIFY
      // ======================================================

      const results =
        await verifyQuestionsWithAI(
          questionIds
        );

      // ======================================================
      // SUMMARY
      // ======================================================

      const successful =
        results.filter(
          (item: any) =>
            item.success === true
        ).length;

      const failed =
        results.filter(
          (item: any) =>
            item.success === false
        ).length;

      const wrong =
        results.filter(
          (item: any) =>
            item.success === true &&
            item.aiStatus === "wrong"
        ).length;

      const correct =
        results.filter(
          (item: any) =>
            item.success === true &&
            item.aiStatus === "correct"
        ).length;

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(200).json({
        success: true,

        message:
          "AI verification completed",

        summary: {
          total:
            questionIds.length,

          successful,

          failed,

          correct,

          wrong,
        },

        results,
      });

    } catch (error: any) {
      console.error(
        "VERIFY MULTIPLE QUESTIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "AI verification failed",
      });
    }
  };

// ============================================================
// 3. VERIFY ALL QUESTIONS OF A TEST
// POST /api/ai/questions/test/:testId/verify
// ============================================================

export const verifyTestQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { testId } =
        req.params;

      if (!testId) {
        res.status(400).json({
          success: false,
          message: "Test ID is required",
        });

        return;
      }

      // ======================================================
      // FIND QUESTIONS
      // ======================================================

      const questions =
        await QuestionBank.find({
          testId,
        }).select("_id");

      if (
        questions.length === 0
      ) {
        res.status(404).json({
          success: false,

          message:
            "No questions found for this test",
        });

        return;
      }

      const questionIds =
        questions.map(
          (question) =>
            question._id.toString()
        );

      // ======================================================
      // VERIFY
      // ======================================================

      const results =
        await verifyQuestionsWithAI(
          questionIds
        );

      // ======================================================
      // SUMMARY
      // ======================================================

      const correct =
        results.filter(
          (item: any) =>
            item.success === true &&
            item.aiStatus === "correct"
        ).length;

      const wrong =
        results.filter(
          (item: any) =>
            item.success === true &&
            item.aiStatus === "wrong"
        ).length;

      const failed =
        results.filter(
          (item: any) =>
            item.success === false
        ).length;

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(200).json({
        success: true,

        message:
          "Test questions AI verification completed",

        testId,

        summary: {
          total:
            questions.length,

          correct,

          wrong,

          failed,
        },

        results,
      });

    } catch (error: any) {
      console.error(
        "VERIFY TEST QUESTIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Test verification failed",
      });
    }
  };

// ============================================================
// 4. GET AI ISSUES
//
// This API is used by the 🔔 Bell notification.
//
// GET /api/ai/questions/issues
//
// Example:
//
// /issues
// /issues?examType=NEET
// /issues?academicYear=1st%20PUC
// /issues?testId=ABC
// /issues?subject=Physics
// ============================================================

export const getAIQuestionIssues =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        examType,
        academicYear,
        testCategory,
        subject,
        testId,
        severity,
      } = req.query;

      // ======================================================
      // BASE FILTER
      // ======================================================

      const filter: any = {
        aiVerified: true,

        aiIssues: {
          $elemMatch: {
            resolved: false,
          },
        },
      };

      // ======================================================
      // EXAM TYPE
      // ======================================================

      if (
        examType &&
        examType !== "All"
      ) {
        filter.examType =
          String(examType);
      }

      // ======================================================
      // ACADEMIC YEAR
      // ======================================================

      if (
        academicYear &&
        academicYear !== "All"
      ) {
        filter.academicYear =
          String(academicYear);
      }

      // ======================================================
      // TEST CATEGORY
      // ======================================================

      if (
        testCategory &&
        testCategory !== "All"
      ) {
        filter.testCategory =
          String(testCategory);
      }

      // ======================================================
      // SUBJECT
      // ======================================================

      if (
        subject &&
        subject !== "All"
      ) {
        filter.subject =
          String(subject);
      }

      // ======================================================
      // TEST ID
      // ======================================================

      if (
        testId &&
        testId !== "All"
      ) {
        filter.testId =
          String(testId);
      }

      // ======================================================
      // SEVERITY
      // ======================================================

      if (
        severity &&
        severity !== "All"
      ) {
        filter.aiIssues = {
          $elemMatch: {
            resolved: false,

            severity:
              String(severity),
          },
        };
      }

      // ======================================================
      // FIND QUESTIONS
      // ======================================================

      const questions =
        await QuestionBank.find(
          filter
        )
          .select(
            [
              "_id",
              "questionNumber",
              "question",
              "options",
              "correctAnswer",
              "subject",
              "chapter",
              "examType",
              "academicYear",
              "testCategory",
              "testTitle",
              "testId",
              "aiStatus",
              "aiIssues",
              "aiExplanation",
              "aiCheckedAt",
            ].join(" ")
          )
          .sort({
            updatedAt: -1,
          });

      // ======================================================
      // FORMAT BELL NOTIFICATIONS
      // ======================================================

      const notifications: any[] =
        [];

      questions.forEach(
        (question: any) => {
          const unresolvedIssues =
            (
              question.aiIssues ||
              []
            ).filter(
              (issue: any) =>
                issue.resolved === false
            );

          unresolvedIssues.forEach(
            (issue: any) => {
              notifications.push({
                questionId:
                  question._id,

                questionNumber:
                  question.questionNumber,

                question:
                  question.question,

                subject:
                  question.subject,

                chapter:
                  question.chapter,

                examType:
                  question.examType,

                academicYear:
                  question.academicYear,

                testCategory:
                  question.testCategory,

                testTitle:
                  question.testTitle,

                testId:
                  question.testId,

                field:
                  issue.field,

                message:
                  issue.message,

                severity:
                  issue.severity,

                resolved:
                  issue.resolved,

                aiStatus:
                  question.aiStatus,

                aiCheckedAt:
                  question.aiCheckedAt,
              });
            }
          );
        }
      );

      // ======================================================
      // COUNTS
      // ======================================================

      const high =
        notifications.filter(
          (item) =>
            item.severity ===
            "high"
        ).length;

      const medium =
        notifications.filter(
          (item) =>
            item.severity ===
            "medium"
        ).length;

      const low =
        notifications.filter(
          (item) =>
            item.severity ===
            "low"
        ).length;

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(200).json({
        success: true,

        totalQuestions:
          questions.length,

        totalIssues:
          notifications.length,

        counts: {
          high,
          medium,
          low,
        },

        notifications,
      });

    } catch (error: any) {
      console.error(
        "GET AI ISSUES ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to get AI issues",
      });
    }
  };

// ============================================================
// 5. RESOLVE ONE AI ISSUE
//
// PATCH
// /api/ai/questions/:id/issues/:issueIndex/resolve
//
// IMPORTANT:
// Head manually fixes the question first.
// Then this API marks the AI issue as resolved.
// ============================================================

export const resolveAIQuestionIssue =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        id,
        issueIndex,
      } = req.params;

      // ======================================================
      // VALIDATE
      // ======================================================

      if (!id) {
        res.status(400).json({
          success: false,

          message:
            "Question ID is required",
        });

        return;
      }

      const index =
        Number(issueIndex);

      if (
        Number.isNaN(index) ||
        index < 0
      ) {
        res.status(400).json({
          success: false,

          message:
            "Valid issue index is required",
        });

        return;
      }

      // ======================================================
      // FIND QUESTION
      // ======================================================

      const question =
        await QuestionBank.findById(
          id
        );

      if (!question) {
        res.status(404).json({
          success: false,

          message:
            "Question not found",
        });

        return;
      }

      // ======================================================
      // CHECK ISSUE
      // ======================================================

      if (
        !question.aiIssues ||
        !question.aiIssues[index]
      ) {
        res.status(404).json({
          success: false,

          message:
            "AI issue not found",
        });

        return;
      }

      // ======================================================
      // RESOLVE
      // ======================================================

      question.aiIssues[
        index
      ].resolved = true;

      // ======================================================
      // CHECK REMAINING ISSUES
      // ======================================================

      const remainingIssues =
        question.aiIssues.filter(
          (issue) =>
            issue.resolved === false
        );

      if (
        remainingIssues.length ===
        0
      ) {
        question.aiStatus =
          "correct";
      }

      // ======================================================
      // SAVE
      // ======================================================

      await question.save();

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(200).json({
        success: true,

        message:
          "AI issue resolved successfully",

        questionId: id,

        issueIndex: index,

        remainingIssues:
          remainingIssues.length,

        aiStatus:
          question.aiStatus,

        question,
      });

    } catch (error: any) {
      console.error(
        "RESOLVE AI ISSUE ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to resolve AI issue",
      });
    }
  };

// ============================================================
// 6. GET AI ISSUE COUNT
//
// Used directly for 🔔 bell badge.
//
// GET /api/ai/questions/issues/count
// ============================================================

export const getAIIssueCount =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const questions =
        await QuestionBank.find({
          aiVerified: true,

          aiIssues: {
            $elemMatch: {
              resolved: false,
            },
          },
        }).select(
          "aiIssues"
        );

      let count = 0;

      let high = 0;
      let medium = 0;
      let low = 0;

      questions.forEach(
        (question: any) => {
          (
            question.aiIssues ||
            []
          ).forEach(
            (issue: any) => {
              if (
                issue.resolved ===
                false
              ) {
                count++;

                if (
                  issue.severity ===
                  "high"
                ) {
                  high++;
                }

                if (
                  issue.severity ===
                  "medium"
                ) {
                  medium++;
                }

                if (
                  issue.severity ===
                  "low"
                ) {
                  low++;
                }
              }
            }
          );
        }
      );

      res.status(200).json({
        success: true,

        count,

        severity: {
          high,
          medium,
          low,
        },
      });

    } catch (error: any) {
      console.error(
        "GET AI ISSUE COUNT ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to get AI issue count",
      });
    }
  };