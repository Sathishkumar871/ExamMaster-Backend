import "dotenv/config";
import cors from "cors";

import app from "./app";
import connectDB from "./config/db";
import { connectCloudinary } from "./config/cloudinary";
import pool, {
  testPostgresConnection,
} from "./config/postgres";
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
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `✅ AUTO PUBLISHED MOCK QUESTIONS: ${result.modifiedCount}`,
      );
    }
  } catch (error) {
    console.error("❌ AUTO PUBLISH SCHEDULER ERROR:", error);
  }
};


// ============================================================
// CHECK IMAGEKIT CONNECTION
// Verifies the backend private key at startup without uploading
// a file. This is a non-fatal check so other APIs can still run
// if ImageKit is temporarily unavailable.
// ============================================================
const checkImageKitConnection = async (): Promise<void> => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();

  if (!privateKey) {
    console.warn(
      "⚠️ IMAGEKIT_PRIVATE_KEY is missing. Staff Media uploads will not work until it is configured.",
    );
    return;
  }

  try {
    const response = await fetch(
      "https://api.imagekit.io/v1/files?limit=1",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    // Read the response body so ImageKit's specific reason for a 403
    // can be diagnosed. Never log the API key or Authorization header.
    const responseText = await response.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Keep non-JSON responses as text.
    }

    const requestId = response.headers.get("x-ik-requestId");

    if (response.ok) {
      console.log("✅ IMAGEKIT CONNECTION SUCCESSFUL — private key accepted");
      return;
    }

    console.error(`❌ IMAGEKIT API CHECK FAILED (HTTP ${response.status}).`);
    console.error("ImageKit response:", responseBody);
    if (requestId) {
      console.error("ImageKit request ID:", requestId);
    }

    if (response.status === 401) {
      console.error(
        "Check that IMAGEKIT_PRIVATE_KEY is the active private API key and that the environment variable contains the full value.",
      );
      return;
    }

    if (response.status === 403) {
      console.error(
        "403 can indicate an expired/invalid key, account-level restriction, or a restricted key without Media Management read access. Check the response message above and your ImageKit dashboard.",
      );
      return;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";

    console.error(
      `⚠️ IMAGEKIT CONNECTION CHECK COULD NOT COMPLETE: ${message}`,
    );
  }
};

// ============================================================
// CREATE COMMUNITY UPDATES TABLE
// ============================================================
const ensureCommunityUpdatesTable = async () => {
  try {
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
          CHECK (visibility IN ('village', 'mandal', 'district', 'all')),
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
          CHECK (status IN ('draft', 'published')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE community_updates
      ADD COLUMN IF NOT EXISTS eligibility TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS benefits TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS application_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS application_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS official_website_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT ''
    `);

    await pool.query(`
      ALTER TABLE community_updates
      ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS salary TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS application_deadline DATE,
      ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS apply_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_category ON community_updates(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_status_active ON community_updates(status, is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_posted_by ON community_updates(posted_by)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_location ON community_updates(state, district, mandal, village)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_visibility ON community_updates(visibility)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_event_date ON community_updates(event_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_expires_at ON community_updates(expires_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_category_status_active ON community_updates(category, status, is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_job_deadline ON community_updates(application_deadline)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_updates_job_featured ON community_updates(is_featured)`);

    console.log("✅ COMMUNITY UPDATES TABLE READY");
    console.log("✅ GOVERNMENT SCHEME FIELDS READY");
    console.log("✅ JOB FIELDS READY");
  } catch (error) {
    console.error("❌ COMMUNITY UPDATES TABLE CREATION ERROR:", error);
    throw error;
  }
};

// ============================================================
// CREATE SEPARATE ACTIVITIES TABLE
// Automatically creates PostgreSQL table at server startup.
// This table is independent of community_updates.
// ============================================================
const ensureActivitiesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id BIGSERIAL PRIMARY KEY,

        activity_type VARCHAR(40) NOT NULL
          CHECK (activity_type IN (
            'sports-games',
            'meetings',
            'competitions',
            'career-guidance',
            'skills-training',
            'social-service',
            'cultural-events',
            'entrepreneurship',
            'health-fitness'
          )),

        title VARCHAR(180) NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',

        state VARCHAR(160) NOT NULL,
        district VARCHAR(160) NOT NULL,
        mandal VARCHAR(160) NOT NULL,
        village VARCHAR(160) NOT NULL,

        visibility VARCHAR(20) NOT NULL DEFAULT 'village'
          CHECK (visibility IN ('village', 'mandal', 'district', 'all')),

        event_date DATE NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        venue TEXT NOT NULL DEFAULT '',
        contact_number VARCHAR(40) NOT NULL DEFAULT '',
        registration_link TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',

        posted_by VARCHAR(255) NOT NULL,
        posted_by_name VARCHAR(180) NOT NULL DEFAULT 'Volunteer',

        status VARCHAR(20) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'published', 'unpublished')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMPTZ NULL,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT activities_title_not_blank
          CHECK (length(btrim(title)) > 0),
        CONSTRAINT activities_state_not_blank
          CHECK (length(btrim(state)) > 0),
        CONSTRAINT activities_district_not_blank
          CHECK (length(btrim(district)) > 0),
        CONSTRAINT activities_mandal_not_blank
          CHECK (length(btrim(mandal)) > 0),
        CONSTRAINT activities_village_not_blank
          CHECK (length(btrim(village)) > 0),
        CONSTRAINT activities_end_after_start
          CHECK (
            start_time IS NULL OR end_time IS NULL OR end_time > start_time
          )
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_public_date
      ON activities (event_date ASC NULLS LAST, start_time ASC NULLS LAST, created_at DESC)
      WHERE status = 'published' AND is_active = TRUE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_type_status_date
      ON activities (activity_type, status, event_date);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_posted_by_created
      ON activities (posted_by, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_state_district_mandal_village
      ON activities (state, district, mandal, village);
    `);

    console.log("✅ ACTIVITIES TABLE READY");
    console.log("✅ ACTIVITIES INDEXES READY");
  } catch (error) {
    console.error("❌ ACTIVITIES TABLE CREATION ERROR:", error);
    throw error;
  }
};

// ============================================================
// START SERVER
// ============================================================
const startServer = async () => {
  try {
    // CONNECT MONGODB
    await connectDB();

    // CONNECT CLOUDINARY
    await connectCloudinary();

    // CHECK IMAGEKIT PRIVATE KEY / API CONNECTION (non-fatal)
    await checkImageKitConnection();

    // TEST NEON POSTGRESQL
    await testPostgresConnection();

    // CREATE / VERIFY DATABASE TABLES BEFORE LISTENING
    await ensureCommunityUpdatesTable();
    await ensureActivitiesTable();

    const PORT = process.env.PORT || 5000;

    // START AUTO PUBLISH CHECK
    await autoPublishScheduledMockTests();
    setInterval(autoPublishScheduledMockTests, 30 * 1000);

    // START EXPRESS SERVER
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log("⏰ Mock Test auto-publish scheduler started");
      console.log("🗄️ Community Updates PostgreSQL table initialized");
      console.log("🏛️ Government Scheme fields initialized");
      console.log("💼 Jobs & Opportunities fields initialized");
      console.log("🎯 Activities PostgreSQL table initialized");
    });
  } catch (error) {
    console.error("❌ SERVER START ERROR:", error);
    process.exit(1);
  }
};

startServer();
