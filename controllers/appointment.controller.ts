import {
  Request,
  Response,
} from "express";

import crypto from "crypto";

import pool from "../config/postgres";

// ============================================================
// HELPERS
// ============================================================

const normalizeString = (
  value: unknown,
  fallback = "",
): string => {
  return String(
    value ?? fallback,
  ).trim();
};

const validDate = (
  value: string,
): boolean => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`,
  );

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    date
      .toISOString()
      .slice(0, 10) === value
  );
};

// ============================================================
// CREATE BOOKING ID
// ============================================================

const createBookingId = (): string => {
  return (
    `JS-${Date.now()}-` +
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()
  );
};

// ============================================================
// USER - BOOK APPOINTMENT
//
// POST /api/appointments
//
// BODY:
// {
//   "date": "2026-10-06",
//   "slotId": "slot-123",
//   "userId": "123",
//   "userName": "Sathish",
//   "mobile": "9876543210",
//   "reasonType": "general_help"
// }
// ============================================================

export const createAppointment =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const client =
      await pool.connect();

    let transactionStarted =
      false;

    try {
      const date =
        normalizeString(
          req.body?.date,
        );

      const slotId =
        normalizeString(
          req.body?.slotId,
        );

      const userId =
        normalizeString(
          req.body?.userId,
        );

      const userName =
        normalizeString(
          req.body?.userName,
        );

      const mobile =
        normalizeString(
          req.body?.mobile,
        );

      const reasonType =
        normalizeString(
          req.body?.reasonType,
          "general_help",
        );

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be in YYYY-MM-DD format.",
        });

        return;
      }

      if (!slotId) {
        res.status(400).json({
          success: false,
          message:
            "Slot ID is required.",
        });

        return;
      }

      if (!userName) {
        res.status(400).json({
          success: false,
          message:
            "User name is required.",
        });

        return;
      }

      if (!mobile) {
        res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });

        return;
      }

      // --------------------------------------------------------
      // START TRANSACTION
      // --------------------------------------------------------

      await client.query(
        "BEGIN",
      );

      transactionStarted = true;

      // --------------------------------------------------------
      // GET PUBLISHED SLOT
      //
      // FOR UPDATE protects the slot during booking.
      // --------------------------------------------------------

      const slotResult =
        await client.query(
          `
            SELECT
              s.client_slot_id,
              s.max_members,
              s.slot_status,
              s.start_time,
              s.end_time,
              s.reason_type,
              s.title,
              s.description,

              a.available_date,
              a.published,
              a.day_status

            FROM staff_availability_slots AS s

            INNER JOIN staff_daily_availability AS a
              ON a.id = s.availability_id

            WHERE
              a.available_date = $1::date
              AND s.client_slot_id = $2
              AND a.published = TRUE

            FOR UPDATE OF s
          `,
          [
            date,
            slotId,
          ],
        );

      if (
        slotResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(404).json({
          success: false,
          message:
            "Selected slot is not available.",
        });

        return;
      }

      const slot =
        slotResult.rows[0];

      // --------------------------------------------------------
      // CHECK DAY STATUS
      // --------------------------------------------------------

      if (
        slot.day_status ===
          "leave" ||
        slot.day_status ===
          "closed"
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(400).json({
          success: false,
          message:
            "Appointments are not available on this date.",
        });

        return;
      }

      // --------------------------------------------------------
      // CHECK SLOT STATUS
      // --------------------------------------------------------

      if (
        slot.slot_status !==
        "available"
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(400).json({
          success: false,
          message:
            "This slot is currently unavailable.",
        });

        return;
      }

      const maxMembers =
        Number(
          slot.max_members || 0,
        );

      if (maxMembers < 1) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(400).json({
          success: false,
          message:
            "This slot has no available capacity.",
        });

        return;
      }

      // --------------------------------------------------------
      // CHECK SAME USER / MOBILE DUPLICATE
      // --------------------------------------------------------

      const duplicateResult =
        await client.query(
          `
            SELECT
              booking_id

            FROM appointment_bookings

            WHERE
              appointment_date = $1::date
              AND slot_id = $2
              AND mobile = $3
              AND status = 'booked'

            LIMIT 1
          `,
          [
            date,
            slotId,
            mobile,
          ],
        );

      if (
        duplicateResult.rows.length >
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(409).json({
          success: false,
          message:
            "You have already booked this slot.",
          bookingId:
            duplicateResult
              .rows[0]
              .booking_id,
        });

        return;
      }

      // --------------------------------------------------------
      // GET CURRENT BOOKING COUNT
      // --------------------------------------------------------

      const countResult =
        await client.query(
          `
            SELECT
              COUNT(*)::int AS booked_members

            FROM appointment_bookings

            WHERE
              appointment_date = $1::date
              AND slot_id = $2
              AND status = 'booked'
          `,
          [
            date,
            slotId,
          ],
        );

      const bookedMembers =
        Number(
          countResult.rows[0]
            ?.booked_members || 0,
        );

      const availableMembers =
        Math.max(
          0,
          maxMembers -
            bookedMembers,
        );

      // --------------------------------------------------------
      // FULL CHECK
      // --------------------------------------------------------

      if (
        availableMembers <= 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted = false;

        res.status(409).json({
          success: false,
          message:
            "This slot is full.",
          slot: {
            date,
            slotId,
            maxMembers,
            bookedMembers,
            availableMembers: 0,
            isFull: true,
          },
        });

        return;
      }

      // --------------------------------------------------------
      // CREATE BOOKING ID
      // --------------------------------------------------------

      const bookingId =
        createBookingId();

      // --------------------------------------------------------
      // INSERT BOOKING
      // --------------------------------------------------------

      await client.query(
        `
          INSERT INTO appointment_bookings (
            booking_id,
            appointment_date,
            slot_id,
            user_id,
            user_name,
            mobile,
            reason_type,
            status,
            created_at,
            updated_at
          )

          VALUES (
            $1,
            $2::date,
            $3,
            $4,
            $5,
            $6,
            $7,
            'booked',
            NOW(),
            NOW()
          )
        `,
        [
          bookingId,
          date,
          slotId,
          userId || null,
          userName,
          mobile,
          reasonType,
        ],
      );

      // --------------------------------------------------------
      // UPDATED COUNT
      // --------------------------------------------------------

      const newBookedMembers =
        bookedMembers + 1;

      const newAvailableMembers =
        Math.max(
          0,
          maxMembers -
            newBookedMembers,
        );

      // --------------------------------------------------------
      // COMMIT
      // --------------------------------------------------------

      await client.query(
        "COMMIT",
      );

      transactionStarted = false;

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      res.status(201).json({
        success: true,

        message:
          "Appointment booked successfully.",

        booking: {
          bookingId,

          date,

          slotId,

          startTime:
            slot.start_time,

          endTime:
            slot.end_time,

          userId:
            userId || null,

          userName,

          mobile,

          reasonType,

          status: "booked",

          maxMembers,

          bookedMembers:
            newBookedMembers,

          availableMembers:
            newAvailableMembers,

          isFull:
            newAvailableMembers ===
            0,

          createdAt:
            new Date().toISOString(),
        },
      });
    } catch (error: any) {
      if (
        transactionStarted
      ) {
        try {
          await client.query(
            "ROLLBACK",
          );
        } catch {
          // Ignore rollback error
        }
      }

      console.error(
        "[CREATE APPOINTMENT ERROR]",
        error,
      );

      if (
        error?.code ===
        "23505"
      ) {
        res.status(409).json({
          success: false,
          message:
            "This appointment has already been booked.",
        });

        return;
      }

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to book appointment.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// USER - GET MY APPOINTMENTS
//
// GET /api/appointments/my?mobile=9876543210
// ============================================================

export const getMyAppointments =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const client =
      await pool.connect();

    try {
      const mobile =
        normalizeString(
          req.query.mobile,
        );

      if (!mobile) {
        res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });

        return;
      }

      const result =
        await client.query(
          `
            SELECT
              booking_id,
              TO_CHAR(
                appointment_date,
                'YYYY-MM-DD'
              ) AS date,

              slot_id,

              user_id,

              user_name,

              mobile,

              reason_type,

              status,

              created_at,

              updated_at

            FROM appointment_bookings

            WHERE mobile = $1

            ORDER BY
              appointment_date DESC,
              created_at DESC
          `,
          [mobile],
        );

      res.json({
        success: true,

        count:
          result.rows.length,

        appointments:
          result.rows,
      });
    } catch (error: any) {
      console.error(
        "[GET MY APPOINTMENTS ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load appointments.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// USER - CANCEL APPOINTMENT
//
// POST /api/appointments/:bookingId/cancel
//
// BODY:
// {
//   "mobile": "9876543210"
// }
// ============================================================

export const cancelAppointment =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const client =
      await pool.connect();

    try {
      const bookingId =
        normalizeString(
          req.params.bookingId,
        );

      const mobile =
        normalizeString(
          req.body?.mobile,
        );

      if (!bookingId) {
        res.status(400).json({
          success: false,
          message:
            "Booking ID is required.",
        });

        return;
      }

      if (!mobile) {
        res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });

        return;
      }

      const result =
        await client.query(
          `
            UPDATE appointment_bookings

            SET
              status = 'cancelled',
              updated_at = NOW()

            WHERE
              booking_id = $1
              AND mobile = $2
              AND status = 'booked'

            RETURNING
              booking_id,

              TO_CHAR(
                appointment_date,
                'YYYY-MM-DD'
              ) AS date,

              slot_id,

              status,

              updated_at
          `,
          [
            bookingId,
            mobile,
          ],
        );

      if (
        result.rows.length === 0
      ) {
        res.status(404).json({
          success: false,
          message:
            "Active appointment not found.",
        });

        return;
      }

      res.json({
        success: true,

        message:
          "Appointment cancelled successfully.",

        booking:
          result.rows[0],
      });
    } catch (error: any) {
      console.error(
        "[CANCEL APPOINTMENT ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to cancel appointment.",
      });
    } finally {
      client.release();
    }
  };