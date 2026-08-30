import Question from "../models/questionModel";

// ============================================================
// AUTO PUBLISH SCHEDULED MOCK TESTS
// ============================================================

export const publishScheduledMockTests =
  async (): Promise<void> => {
    try {
      const now =
        new Date();

      const result =
        await Question.updateMany(
          {
            testCategory:
              "mock",

            isPublished:
              false,

            publishAt: {
              $ne: null,

              $lte: now,
            },
          },
          {
            $set: {
              isPublished:
                true,

              status:
                "published",
            },
          }
        );

      if (
        result.modifiedCount >
        0
      ) {
        console.log(
          "=========================================="
        );

        console.log(
          "[MOCK SCHEDULER] PUBLISHED QUESTIONS:",
          result.modifiedCount
        );

        console.log(
          "TIME:",
          now
        );

        console.log(
          "=========================================="
        );
      }
    } catch (error) {
      console.error(
        "[MOCK SCHEDULER ERROR]:",
        error
      );
    }
  };