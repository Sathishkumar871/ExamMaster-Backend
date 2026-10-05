import "dotenv/config";
import pg from "pg";

const {
  Pool,
} = pg;

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
// CREATE TABLES
// ============================================================

const createAppointmentTables =
  async (): Promise<void> => {
    const client =
      await pool.connect();

    try {
      console.log(
        "🔄 Creating appointment booking table...",
      );

      // --------------------------------------------------------
      // MAIN BOOKING TABLE
      // --------------------------------------------------------

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

          reason_type VARCHAR(50)
            DEFAULT 'general_help',

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
        "✅ appointment_bookings table created.",
      );

      // --------------------------------------------------------
      // SLOT INDEX
      // --------------------------------------------------------

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_slot
        ON appointment_bookings (
          appointment_date,
          slot_id
        );
      `);

      console.log(
        "✅ Slot index created.",
      );

      // --------------------------------------------------------
      // MOBILE INDEX
      // --------------------------------------------------------

      await client.query(`
        CREATE INDEX IF NOT EXISTS
        idx_appointment_bookings_mobile
        ON appointment_bookings (
          mobile,
          appointment_date
        );
      `);

      console.log(
        "✅ Mobile index created.",
      );

      // --------------------------------------------------------
      // PREVENT DUPLICATE ACTIVE BOOKING
      //
      // Same user cannot book the same slot twice
      // --------------------------------------------------------

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
        "✅ Duplicate booking protection created.",
      );

      console.log(
        "🎉 Appointment database setup completed successfully.",
      );
    } catch (error) {
      console.error(
        "❌ Failed to create appointment tables:",
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