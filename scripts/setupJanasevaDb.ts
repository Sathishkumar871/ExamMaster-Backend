import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "❌ DATABASE_URL is missing in .env"
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔄 Connecting to Neon PostgreSQL...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS states (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id BIGSERIAL PRIMARY KEY,
        state_id BIGINT NOT NULL
          REFERENCES states(id)
          ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(state_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mandals (
        id BIGSERIAL PRIMARY KEY,
        district_id BIGINT NOT NULL
          REFERENCES districts(id)
          ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(district_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS villages (
        id BIGSERIAL PRIMARY KEY,
        mandal_id BIGINT NOT NULL
          REFERENCES mandals(id)
          ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(mandal_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS janaseva_users (
        id BIGSERIAL PRIMARY KEY,

        name VARCHAR(120) NOT NULL,

        mobile VARCHAR(15) NOT NULL UNIQUE,

        email VARCHAR(255) NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        profile_image TEXT,

        state VARCHAR(100) NOT NULL,

        district VARCHAR(100) NOT NULL,

        area_type VARCHAR(20) NOT NULL
          CHECK (
            area_type IN (
              'Urban',
              'Rural',
              'Agency'
            )
          ),

        city VARCHAR(150),

        mandal VARCHAR(150),

        village VARCHAR(200),

        agency_area VARCHAR(150),

        terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,

        role VARCHAR(30) NOT NULL DEFAULT 'user',

        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Helpful indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_districts_state_id
      ON districts(state_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mandals_district_id
      ON mandals(district_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_villages_mandal_id
      ON villages(mandal_id);
    `);

    console.log("✅ states table ready");
    console.log("✅ districts table ready");
    console.log("✅ mandals table ready");
    console.log("✅ villages table ready");
    console.log("✅ janaseva_users table ready");
    console.log("🎉 Janaseva PostgreSQL database setup completed");
  } catch (error) {
    console.error(
      "❌ DATABASE SETUP FAILED:",
      error
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setupDatabase();