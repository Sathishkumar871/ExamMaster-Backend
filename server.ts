import "dotenv/config";
import cors from "cors";

import app from "./app";
import connectDB from "./config/db";
import { connectCloudinary } from "./config/cloudinary";
import pool, {
  testPostgresConnection,
} from "./config/postgres";
import Question from "./models/questionModel";

console.log(
  "🔥🔥🔥 THIS SERVER.TS IS RUNNING",
);

console.log(
  "🔥 APP LOADED:",
  !!app,
);

// ============================================================
// CORS
// ============================================================

app.use(cors());

// ============================================================
// AUTO PUBLISH SCHEDULED MOCK TESTS
// ============================================================

const autoPublishScheduledMockTests =
  async () => {
    try {
      const now = new Date();

      const result =
        await Question.updateMany(
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
          },
        );

      if (result.modifiedCount > 0) {
        console.log(
          `✅ AUTO PUBLISHED MOCK QUESTIONS: ${result.modifiedCount}`,
        );
      }
    } catch (error) {
      console.error(
        "❌ AUTO PUBLISH SCHEDULER ERROR:",
        error,
      );
    }
  };

// ============================================================
// CREATE COMMUNITY UPDATES TABLE
// Automatically creates PostgreSQL table if not exists
// ============================================================

const ensureCommunityUpdatesTable =
  async () => {
    try {
      // ========================================================
      // CREATE MAIN TABLE
      // ========================================================

      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_updates (
          id BIGSERIAL PRIMARY KEY,

          category VARCHAR(40) NOT NULL
            CHECK (
              category IN (
                'medical',
                'education',
                'government_scheme',
                'jobs',
                'youth_meeting'
              )
            ),

          title VARCHAR(200) NOT NULL,

          summary VARCHAR(500) NOT NULL,

          description TEXT NOT NULL,

          state VARCHAR(150) NOT NULL,

          district VARCHAR(150) NOT NULL,

          mandal VARCHAR(150) NOT NULL,

          village VARCHAR(150) NOT NULL,

          visibility VARCHAR(20) NOT NULL DEFAULT 'village'
            CHECK (
              visibility IN (
                'village',
                'mandal',
                'district',
                'all'
              )
            ),

          event_date DATE,

          start_time VARCHAR(5) NOT NULL DEFAULT '',

          end_time VARCHAR(5) NOT NULL DEFAULT '',

          venue VARCHAR(300) NOT NULL DEFAULT '',

          contact_number VARCHAR(20) NOT NULL DEFAULT '',

          external_link TEXT NOT NULL DEFAULT '',

          image_url TEXT NOT NULL DEFAULT '',

          posted_by VARCHAR(120) NOT NULL,

          posted_by_name VARCHAR(200) NOT NULL,

          status VARCHAR(20) NOT NULL DEFAULT 'draft'
            CHECK (
              status IN (
                'draft',
                'published'
              )
            ),

          is_active BOOLEAN NOT NULL DEFAULT TRUE,

          expires_at TIMESTAMPTZ,

          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // ========================================================
      // GOVERNMENT SCHEME EXTRA FIELDS
      //
      // Existing records are safe because all fields
      // have default values.
      // ========================================================

      await pool.query(`
        ALTER TABLE community_updates

        ADD COLUMN IF NOT EXISTS eligibility
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS benefits
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS required_documents
          JSONB NOT NULL DEFAULT '[]'::jsonb,

        ADD COLUMN IF NOT EXISTS application_steps
          JSONB NOT NULL DEFAULT '[]'::jsonb,

        ADD COLUMN IF NOT EXISTS application_url
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS official_website_url
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS video_url
          TEXT DEFAULT ''
      `);

      // ========================================================
      // JOB & OPPORTUNITY EXTRA FIELDS
      //
      // Existing records are safe because all fields
      // have default values.
      // ========================================================

      await pool.query(`
        ALTER TABLE community_updates

        ADD COLUMN IF NOT EXISTS company_name
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS job_type
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS salary
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS qualification
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS experience
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS application_deadline
          DATE,

        ADD COLUMN IF NOT EXISTS requirements
          JSONB NOT NULL DEFAULT '[]'::jsonb,

        ADD COLUMN IF NOT EXISTS responsibilities
          JSONB NOT NULL DEFAULT '[]'::jsonb,

        ADD COLUMN IF NOT EXISTS apply_url
          TEXT DEFAULT '',

        ADD COLUMN IF NOT EXISTS is_featured
          BOOLEAN NOT NULL DEFAULT FALSE
      `);

      // ========================================================
      // INDEXES
      // ========================================================

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_category
        ON community_updates(category);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_status_active
        ON community_updates(status, is_active);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_posted_by
        ON community_updates(posted_by);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_location
        ON community_updates(
          state,
          district,
          mandal,
          village
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_visibility
        ON community_updates(visibility);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_event_date
        ON community_updates(event_date);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_expires_at
        ON community_updates(expires_at);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_category_status_active
        ON community_updates(
          category,
          status,
          is_active
        );
      `);

      // ========================================================
      // JOB-SPECIFIC INDEXES
      // ========================================================

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_job_deadline
        ON community_updates(application_deadline);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_community_updates_job_featured
        ON community_updates(
          is_featured
        );
      `);

      // ========================================================
      // READY LOGS
      // ========================================================

      console.log(
        "✅ COMMUNITY UPDATES TABLE READY",
      );

      console.log(
        "✅ GOVERNMENT SCHEME FIELDS READY",
      );

      console.log(
        "✅ JOB FIELDS READY",
      );
    } catch (error) {
      console.error(
        "❌ COMMUNITY UPDATES TABLE CREATION ERROR:",
        error,
      );

      throw error;
    }
  };

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    // ========================================================
    // CONNECT MONGODB
    // ========================================================

    await connectDB();

    // ========================================================
    // CONNECT CLOUDINARY
    // ========================================================

    await connectCloudinary();

    // ========================================================
    // TEST NEON POSTGRESQL
    // ========================================================

    await testPostgresConnection();

    // ========================================================
    // CREATE COMMUNITY UPDATES TABLE
    // + GOVERNMENT SCHEME FIELDS
    // + JOB FIELDS
    // ========================================================

    await ensureCommunityUpdatesTable();

    const PORT =
      process.env.PORT || 5000;

    // ========================================================
    // START AUTO PUBLISH CHECK
    // Every 30 seconds
    // ========================================================

    await autoPublishScheduledMockTests();

    setInterval(
      autoPublishScheduledMockTests,
      30 * 1000,
    );

    // ========================================================
    // START EXPRESS SERVER
    // ========================================================

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on http://localhost:${PORT}`,
      );

      console.log(
        "⏰ Mock Test auto-publish scheduler started",
      );

      console.log(
        "🗄️ Community Updates PostgreSQL table initialized",
      );

      console.log(
        "🏛️ Government Scheme fields initialized",
      );

      console.log(
        "💼 Jobs & Opportunities fields initialized",
      );
    });
  } catch (error) {
    console.error(
      "❌ SERVER START ERROR:",
      error,
    );

    process.exit(1);
  }
};

startServer();