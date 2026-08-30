
import "dotenv/config";
import cors from "cors";

import app from "./app";
import connectDB from "./config/db";
import { connectCloudinary } from "./config/cloudinary";
import Question from "./models/questionModel";

console.log("🔥🔥🔥 THIS SERVER.TS IS RUNNING");
console.log("🔥 APP LOADED:", !!app);

// ============================================================
// CORS
// ============================================================

app.use(cors());

// ============================================================
// AUTO PUBLISH SCHEDULED MOCK TESTS
// ============================================================

const autoPublishScheduledMockTests = async () => {
  try {
    const now = new Date();

    const result = await Question.updateMany(
      {
        testCategory: "mock",
        isPublished: false,
        publishAt: {
          $ne: null,
          $lte: now,
        },
      },
      {
        $set: {
          isPublished: true,
          status: "published",
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `✅ AUTO PUBLISHED MOCK QUESTIONS: ${result.modifiedCount}`
      );
    }
  } catch (error) {
    console.error(
      "❌ AUTO PUBLISH SCHEDULER ERROR:",
      error
    );
  }
};

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    await connectDB();
    await connectCloudinary();

    const PORT = process.env.PORT || 5000;

    // ========================================================
    // START AUTO PUBLISH CHECK
    // Every 30 seconds
    // ========================================================

    await autoPublishScheduledMockTests();

    setInterval(
      autoPublishScheduledMockTests,
      30 * 1000
    );

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on http://localhost:${PORT}`
      );

      console.log(
        "⏰ Mock Test auto-publish scheduler started"
      );
    });
  } catch (error) {
    console.error(
      "❌ SERVER START ERROR:",
      error
    );

    process.exit(1);
  }
};

startServer();

