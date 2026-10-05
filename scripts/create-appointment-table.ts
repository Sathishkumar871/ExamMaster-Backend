import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// ============================================================
// DATABASE URL
// ============================================================

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing in environment variables.",
  );
}

// ============================================================
// POSTGRES POOL
// ============================================================

const pool = new Pool({
  connectionString:
    databaseUrl,
});

// ============================================================
// CREATE / UPDATE APPOINTMENT TABLE
// ============================================================

const createAppointmentTables =
  async (): Promise<void> => {
    const client =
      await pool.connect();

    try {
      console.log(
        "🔄 Creating / updating appointment booking system...",
      );

      // ========================================================
      // MAIN TABLE
      // ========================================================

      await client.query(`
        CREATE TABLE IF NOT EXISTS appointment_bookings (
          id BIGSERIAL PRIMARY KEY,

          booking_id VARCHAR(100)
            UNIQUE NOT NULL,

          appointment_date DATE
            NOT NULL,

          slot_id VARCHAR(150)
            NOT NULL,

          user_id VARCHAR(150),

          user_name VARCHAR(150)
            NOT NULL,

          mobile VARCHAR(20)
            NOT NULL,

          alternate_mobile VARCHAR(20)
            DEFAULT '',

          reason_type VARCHAR(50)
            DEFAULT 'general_help',

          notes TEXT
            DEFAULT '',

          status VARCHAR(20)
            NOT NULL
            DEFAULT 'booked',

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          updated_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW()
        );
      `);

      console.log(
        "✅ appointment_bookings table ready.",
      );

      // ========================================================
      // ADD NEW COLUMNS TO EXISTING TABLE
      // ========================================================

      await client.query(`
        ALTER TABLE appointment_bookings
        ADD COLUMN IF NOT EXISTS
        alternate_mobile VARCHAR(20)
        DEFAULT '';
      `);

      await client.query(`
        ALTER TABLE appointment_bookings
        ADD COLUMN IF NOT EXISTS
        notes TEXT
        DEFAULT '';
      `);

      await client.query(`
        ALTER TABLE appointment_bookings
        ADD COLUMN IF NOT EXISTS
        user_id VARCHAR(150);
      `);

      await client.query(`
        ALTER TABLE appointment_bookings
        ADD COLUMN IF NOT EXISTS
        updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();
      `);

      console.log(
        "✅ Booking detail columns checked / added.",
      );

      // ========================================================
      // SAFE DEFAULT DATA
      // ========================================================

      await client.query(`
        UPDATE appointment_bookings
        SET alternate_mobile = ''
        WHERE alternate_mobile IS NULL;
      `);

      await client.query(`
        UPDATE appointment_bookings
        SET notes = ''
        WHERE notes IS NULL;
      `);

      await client.query(`
        UPDATE appointment_bookings
        SET status = 'booked'
        WHERE status IS NULL
           OR TRIM(status) = '';
      `);

      await client.query(`
        UPDATE appointment_bookings
        SET updated_at = created_at
        WHERE updated_at IS NULL;
      `);

      console.log(
        "✅ Existing booking records normalized.",
      );

      // ========================================================
      // SLOT INDEX
      // ========================================================

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_slot
        ON appointment_bookings (
          appointment_date,
          slot_id
        );
      `);

      console.log(
        "✅ Slot index ready.",
      );

      // ========================================================
      // MOBILE INDEX
      // ========================================================

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_mobile
        ON appointment_bookings (
          mobile,
          appointment_date
        );
      `);

      console.log(
        "✅ Mobile index ready.",
      );

      // ========================================================
      // STATUS INDEX
      // ========================================================

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_status
        ON appointment_bookings (
          status
        );
      `);

      console.log(
        "✅ Status index ready.",
      );

      // ========================================================
      // BOOKING DATE INDEX
      // ========================================================

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_date
        ON appointment_bookings (
          appointment_date
        );
      `);

      console.log(
        "✅ Date index ready.",
      );

      // ========================================================
      // PREVENT DUPLICATE ACTIVE BOOKING
      //
      // Same mobile cannot book same slot twice
      //
      // booked = active
      // cancelled = available again
      // rejected = available again
      // ========================================================

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_one_active_booking_per_user_slot
        ON appointment_bookings (
          appointment_date,
          slot_id,
          mobile
        )
        WHERE status = 'booked';
      `);

      console.log(
        "✅ Duplicate active booking protection ready.",
      );

      // ========================================================
      // BOOKINGS FOR LIVE COUNT
      // ========================================================

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_live_slot_count
        ON appointment_bookings (
          appointment_date,
          slot_id,
          status
        );
      `);

      console.log(
        "✅ Live slot count index ready.",
      );

      // ========================================================
      // COMMIT
      // ========================================================

      console.log(
        "🎉 Appointment database setup completed successfully.",
      );

      console.log("");
      console.log(
        "📌 Features enabled:",
      );

      console.log(
        "   ✅ Total members",
      );

      console.log(
        "   ✅ Booked members",
      );

      console.log(
        "   ✅ Available / Left members",
      );

      console.log(
        "   ✅ Full slot detection",
      );

      console.log(
        "   ✅ Name",
      );

      console.log(
        "   ✅ Primary mobile",
      );

      console.log(
        "   ✅ Alternative mobile",
      );

      console.log(
        "   ✅ Service purpose",
      );

      console.log(
        "   ✅ Notes / requirement",
      );

      console.log(
        "   ✅ Duplicate booking protection",
      );

      console.log(
        "   ✅ Cancellation can free a slot",
      );

      console.log(
        "   ✅ Live count database index",
      );
    } catch (error) {
      console.error(
        "❌ Failed to create / update appointment tables:",
        error,
      );

      process.exitCode = 1;
    } finally {
      client.release();

      await pool.end();
    }
  };

// ============================================================
// RUN
// ============================================================

createAppointmentTables();