import { postgresPool } from "../config/postgres";

async function seedHomeHero() {
  try {
    console.log("Connecting to Neon PostgreSQL...");

    // =====================================================
    // CHECK WHETHER HERO SLIDES ALREADY EXIST
    // =====================================================

    const existing = await postgresPool.query(`
      SELECT COUNT(*)::int AS count
      FROM home_hero_slides
    `);

    const existingCount = existing.rows[0].count;

    if (existingCount > 0) {
      console.log(
        `⚠️ Hero slides already exist: ${existingCount}`
      );

      console.log(
        "ℹ️ Seed skipped to avoid duplicate hero slides."
      );

      return;
    }

    // =====================================================
    // INSERT DEFAULT HERO SLIDES
    // =====================================================

    await postgresPool.query(`
      INSERT INTO home_hero_slides (
        badge,
        title,
        description,
        image_url,
        icon,
        action_text,
        action_type,
        action_value,
        is_active,
        display_order
      )
      VALUES

      (
        'COMMUNITY UPDATE',
        'Public service, closer to you.',
        'Stay informed about local services, activities and useful community updates.',
        '',
        'people_alt_outlined',
        'Explore services',
        'info',
        '',
        TRUE,
        0
      ),

      (
        'WELFARE & SUPPORT',
        'Help when you need it.',
        'Find community support options and raise issues through one simple place.',
        '',
        'volunteer_activism_outlined',
        'Get support',
        'info',
        '',
        TRUE,
        1
      ),

      (
        'COMMUNITY ACTIVITIES',
        'Together, we can participate.',
        'Discover camps, events, volunteer activities and local initiatives.',
        '',
        'diversity_3_outlined',
        'View activities',
        'info',
        '',
        TRUE,
        2
      );
    `);

    // =====================================================
    // VERIFY INSERTED DATA
    // =====================================================

    const result = await postgresPool.query(`
      SELECT
        id,
        badge,
        title,
        description,
        image_url,
        icon,
        action_text,
        action_type,
        action_value,
        is_active,
        display_order
      FROM home_hero_slides
      ORDER BY display_order ASC, id ASC
    `);

    console.log("");
    console.log("✅ HERO SLIDES SEEDED SUCCESSFULLY");
    console.log("");

    console.table(result.rows);

    console.log("");
    console.log(
      `✅ Total hero slides: ${result.rows.length}`
    );
  } catch (error) {
    console.error(
      "❌ Failed to seed hero slides:",
      error
    );

    process.exitCode = 1;
  } finally {
    await postgresPool.end();
  }
}

seedHomeHero();