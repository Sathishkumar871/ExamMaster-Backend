import { postgresPool } from "../config/postgres";

async function createHomeHeroTable() {
  try {
    console.log("Connecting to Neon PostgreSQL...");

    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS home_hero_slides (
        id BIGSERIAL PRIMARY KEY,

        badge VARCHAR(120) NOT NULL DEFAULT '',
        title VARCHAR(300) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',

        image_url TEXT NOT NULL DEFAULT '',

        icon VARCHAR(120) NOT NULL DEFAULT 'people_alt_outlined',

        action_text VARCHAR(120) NOT NULL DEFAULT '',
        action_type VARCHAR(50) NOT NULL DEFAULT 'info',
        action_value TEXT NOT NULL DEFAULT '',

        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER NOT NULL DEFAULT 0,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_home_hero_slides_order
      ON home_hero_slides (display_order);

      CREATE INDEX IF NOT EXISTS idx_home_hero_slides_active
      ON home_hero_slides (is_active);
    `);

    console.log("✅ home_hero_slides table created successfully.");

    const result = await postgresPool.query(`
      SELECT COUNT(*)::int AS count
      FROM home_hero_slides
    `);

    console.log(
      `✅ Current hero slides count: ${result.rows[0].count}`
    );
  } catch (error) {
    console.error("❌ Failed to create home_hero_slides table:", error);
    process.exitCode = 1;
  } finally {
    await postgresPool.end();
  }
}

createHomeHeroTable();