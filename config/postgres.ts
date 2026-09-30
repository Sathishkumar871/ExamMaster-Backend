import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

export const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

postgresPool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

postgresPool.on("error", (error) => {
  console.error("❌ PostgreSQL pool error:", error);
});

export async function testPostgresConnection() {
  try {
    const result = await postgresPool.query(
      "SELECT NOW() AS current_time"
    );

    console.log(
      "✅ PostgreSQL test successful:",
      result.rows[0]
    );
  } catch (error) {
    console.error(
      "❌ PostgreSQL connection failed:",
      error
    );
  }
}