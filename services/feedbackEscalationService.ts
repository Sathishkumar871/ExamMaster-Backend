import DepartmentFeedback from "../models/DepartmentFeedback";

// ============================================================
// CONFIG
// ============================================================

const ESCALATION_DAYS = 7;

const ESCALATION_TIME_MS =
  ESCALATION_DAYS *
  24 *
  60 *
  60 *
  1000;

// ============================================================
// AUTO ESCALATION
// ============================================================

export const processFeedbackEscalations =
  async (): Promise<void> => {
    try {
      const now = Date.now();

      const cutoffDate =
        new Date(
          now - ESCALATION_TIME_MS
        );

      // --------------------------------------------------------
      // HEAD → MANAGEMENT
      // --------------------------------------------------------

      const headCases =
        await DepartmentFeedback.find({
          assignedDepartment: "head",

          status: {
            $in: [
              "PENDING",
              "IN_PROGRESS",
            ],
          },

          assignedAt: {
            $lte: cutoffDate,
          },
        });

      for (const feedback of headCases) {
        feedback.assignedDepartment =
          "management";

        feedback.status =
          "ESCALATED";

        feedback.escalatedAt =
          new Date();

        feedback.escalationReason =
          "Head did not resolve the issue within 7 days.";

        feedback.updatedBy =
          "SYSTEM";

        feedback.updatedByRole =
          "manager";

        await feedback.save();

        console.log(
          `Escalated head feedback for student ${feedback.studentId} → Management`
        );
      }
    } catch (error) {
      console.error(
        "Feedback escalation service error:",
        error
      );
    }
  };