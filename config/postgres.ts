import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// ============================================================
// ENV CHECK
// ============================================================

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing in environment variables.",
  );
}

// ============================================================
// POSTGRESQL / NEON POOL
// ============================================================

const postgresPool = new Pool({
  connectionString: databaseUrl,

  // Connection pool settings
  max: 10,
  min: 0,

  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,

  // Helps detect broken connections
  keepAlive: true,
});

// ============================================================
// CONNECTION EVENTS
// ============================================================

postgresPool.on(
  "connect",
  () => {
    console.log(
      "✅ PostgreSQL connected",
    );
  },
);

postgresPool.on(
  "error",
  (error) => {
    console.error(
      "❌ PostgreSQL pool error:",
      error,
    );
  },
);

// ============================================================
// TEST CONNECTION
// ============================================================

export async function testPostgresConnection(): Promise<void> {
  try {
    const result =
      await postgresPool.query(
        "SELECT NOW() AS current_time",
      );

    console.log(
      "✅ PostgreSQL test successful:",
      result.rows[0],
    );
  } catch (error) {
    console.error(
      "❌ PostgreSQL connection failed:",
      error,
    );
  }
}

// ============================================================
// EXPORTS
// ============================================================

// Named export
export {
  postgresPool,
};

// Default export
// Allows:
// import pool from "../config/postgres";
export default postgresPool;