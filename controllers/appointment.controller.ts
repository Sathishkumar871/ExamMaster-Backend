import {
  Request,
  Response,
} from "express";

import crypto from "crypto";

import pool from "../config/postgres";

// ============================================================
// ALLOWED SERVICE PURPOSES
// ============================================================

const ALLOWED_REASON_TYPES = [
  "hospital",
  "sponsor",
  "government_service",
  "document_help",
  "welfare_support",
  "education_support",
  "general_help",
  "other",
];

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

// ============================================================
// MOBILE NORMALIZATION
// ============================================================

const normalizeMobile = (
  value: unknown,
): string => {
  return String(
    value ?? "",
  )
    .replace(/\D/g, "")
    .trim();
};

// ============================================================
// VALID DATE
// ============================================================

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
// VALID MOBILE
// ============================================================

const validMobile = (
  value: string,
): boolean => {
  return /^\d{10}$/.test(
    value,
  );
};

// ============================================================
// VALID REASON
// ============================================================

const validReasonType = (
  value: string,
): boolean => {
  return ALLOWED_REASON_TYPES.includes(
    value,
  );
};

// ============================================================
// CREATE BOOKING ID
// ============================================================

const createBookingId =
  (): string => {
    return (
      `JS-${Date.now()}-` +
      crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()
    );
  };

// ============================================================
// GET SLOT LIVE COUNT
//
// booked = active booking
// cancelled = slot available again
// ============================================================

const getSlotLiveCount =
  async (
    client: any,
    date: string,
    slotId: string,
  ): Promise<number> => {
    const result =
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

    return Number(
      result.rows[0]
        ?.booked_members ?? 0,
    );
  };

// ============================================================
// USER - GET PUBLIC LIVE AVAILABILITY
//
// GET
// /api/appointments/availability/:date
//
// Returns:
//
// totalMembers
// bookedMembers
// availableMembers
// isFull
//
// for every slot.
// ============================================================

export const getAppointmentAvailability =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const client =
      await pool.connect();

    try {
      const date =
        normalizeString(
          req.params.date,
        );

      // --------------------------------------------------------
      // DATE VALIDATION
      // --------------------------------------------------------

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be in YYYY-MM-DD format.",
        });

        return;
      }

      // --------------------------------------------------------
      // GET DAY AVAILABILITY
      // --------------------------------------------------------

      const dayResult =
        await client.query(
          `
            SELECT
              id,
              available_date,
              day_status,
              reason_type,
              title,
              message,
              leave_reason,
              published,
              updated_at

            FROM staff_daily_availability

            WHERE
              available_date = $1::date

            LIMIT 1
          `,
          [date],
        );

      // --------------------------------------------------------
      // NO DAY
      // --------------------------------------------------------

      if (
        dayResult.rows.length ===
        0
      ) {
        res.json({
          success: true,
          available: false,
          availability: null,
        });

        return;
      }

      const day =
        dayResult.rows[0];

      // --------------------------------------------------------
      // NOT PUBLISHED
      // --------------------------------------------------------

      if (!day.published) {
        res.json({
          success: true,
          available: false,
          availability: null,
        });

        return;
      }

      // --------------------------------------------------------
      // LEAVE / CLOSED
      // --------------------------------------------------------

      if (
        day.day_status ===
          "leave" ||
        day.day_status ===
          "closed"
      ) {
        res.json({
          success: true,

          available: false,

          availability: {
            date,
            dayStatus:
              day.day_status,

            reasonType:
              day.reason_type,

            title:
              day.title,

            message:
              day.message,

            leaveReason:
              day.leave_reason,

            totalCapacity: 0,

            bookedMembers: 0,

            availableMembers: 0,

            isFull: true,

            slots: [],

            updatedAt:
              day.updated_at,
          },
        });

        return;
      }

      // --------------------------------------------------------
      // GET SLOTS
      // --------------------------------------------------------

      const slotsResult =
        await client.query(
          `
            SELECT
              client_slot_id,
              start_time,
              end_time,
              slot_status,
              max_members,
              reason_type,
              title,
              description

            FROM staff_availability_slots

            WHERE
              availability_id = $1

            ORDER BY
              start_time ASC,
              id ASC
          `,
          [day.id],
        );

      const slots: any[] =
        [];

      let totalCapacity = 0;

      let totalBooked = 0;

      let totalAvailable = 0;

      // --------------------------------------------------------
      // LIVE COUNT FOR EACH SLOT
      // --------------------------------------------------------

      for (
        const slot of
          slotsResult.rows
      ) {
        const maxMembers =
          Math.max(
            0,
            Number(
              slot.max_members ??
                0,
            ),
          );

        let bookedMembers = 0;

        if (
          slot.slot_status ===
          "available"
        ) {
          bookedMembers =
            await getSlotLiveCount(
              client,
              date,
              slot.client_slot_id,
            );
        }

        const availableMembers =
          Math.max(
            0,
            maxMembers -
              bookedMembers,
          );

        const isFull =
          slot.slot_status ===
            "available" &&
          availableMembers <=
            0;

        if (
          slot.slot_status ===
          "available"
        ) {
          totalCapacity +=
            maxMembers;

          totalBooked +=
            bookedMembers;

          totalAvailable +=
            availableMembers;
        }

        slots.push({
          id:
            slot.client_slot_id,

          startTime:
            slot.start_time,

          endTime:
            slot.end_time,

          status:
            slot.slot_status,

          maxMembers,

          totalMembers:
            maxMembers,

          bookedMembers,

          availableMembers,

          isFull,

          reasonType:
            slot.reason_type,

          title:
            slot.title,

          description:
            slot.description,
        });
      }

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      res.json({
        success: true,

        available: true,

        availability: {
          date,

          dayStatus:
            day.day_status,

          reasonType:
            day.reason_type,

          title:
            day.title,

          message:
            day.message,

          leaveReason:
            day.leave_reason,

          totalCapacity,

          totalMembers:
            totalCapacity,

          bookedMembers:
            totalBooked,

          availableMembers:
            totalAvailable,

          isFull:
            totalAvailable <= 0,

          slots,

          updatedAt:
            day.updated_at,
        },
      });
    } catch (error: any) {
      console.error(
        "[GET APPOINTMENT AVAILABILITY ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load appointment availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// USER - BOOK APPOINTMENT
//
// POST /api/appointments
//
// BODY:
//
// {
//   "date": "2026-10-06",
//   "slotId": "slot-123",
//   "userId": "123",
//   "userName": "Sathish",
//   "mobile": "9876543210",
//   "alternateMobile": "9123456780",
//   "reasonType": "hospital",
//   "notes": "Need medical support"
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
      // ========================================================
      // INPUT
      // ========================================================

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
        normalizeMobile(
          req.body?.mobile,
        );

      const alternateMobile =
        normalizeMobile(
          req.body
            ?.alternateMobile,
        );

      const reasonType =
        normalizeString(
          req.body?.reasonType,
          "general_help",
        ).toLowerCase();

      const notes =
        normalizeString(
          req.body?.notes,
        );

      // ========================================================
      // BASIC VALIDATION
      // ========================================================

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

      if (
        userName.length <
        2
      ) {
        res.status(400).json({
          success: false,
          message:
            "Please enter your full name.",
        });

        return;
      }

      if (
        userName.length >
        150
      ) {
        res.status(400).json({
          success: false,
          message:
            "Name is too long.",
        });

        return;
      }

      if (
        !validMobile(
          mobile,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Mobile number must contain 10 digits.",
        });

        return;
      }

      if (
        alternateMobile &&
        !validMobile(
          alternateMobile,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Alternative number must contain 10 digits.",
        });

        return;
      }

      if (
        alternateMobile &&
        alternateMobile ===
          mobile
      ) {
        res.status(400).json({
          success: false,
          message:
            "Alternative number must be different from primary mobile.",
        });

        return;
      }

      if (
        !validReasonType(
          reasonType,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid service purpose.",
          allowedReasonTypes:
            ALLOWED_REASON_TYPES,
        });

        return;
      }

      if (
        notes.length >
        1000
      ) {
        res.status(400).json({
          success: false,
          message:
            "Notes cannot exceed 1000 characters.",
        });

        return;
      }

      // ========================================================
      // BEGIN TRANSACTION
      // ========================================================

      await client.query(
        "BEGIN",
      );

      transactionStarted = true;

      // ========================================================
      // GET + LOCK SLOT
      //
      // This prevents two simultaneous users from consuming
      // the same remaining capacity.
      // ========================================================

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
              ON a.id =
                s.availability_id

            WHERE
              a.available_date =
                $1::date

              AND s.client_slot_id =
                $2

              AND a.published =
                TRUE

            FOR UPDATE OF s
          `,
          [
            date,
            slotId,
          ],
        );

      if (
        slotResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(404).json({
          success: false,
          message:
            "Selected slot is not available.",
        });

        return;
      }

      const slot =
        slotResult.rows[0];

      // ========================================================
      // CHECK DAY
      // ========================================================

      if (
        slot.day_status ===
          "leave" ||
        slot.day_status ===
          "closed"
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(400).json({
          success: false,
          message:
            "Appointments are not available on this date.",
        });

        return;
      }

      // ========================================================
      // CHECK SLOT STATUS
      // ========================================================

      if (
        slot.slot_status !==
        "available"
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(400).json({
          success: false,
          message:
            "This slot is currently unavailable.",
        });

        return;
      }

      // ========================================================
      // CAPACITY
      // ========================================================

      const maxMembers =
        Math.max(
          0,
          Number(
            slot.max_members ??
              0,
          ),
        );

      if (
        maxMembers < 1
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(400).json({
          success: false,
          message:
            "This slot has no available capacity.",
        });

        return;
      }

      // ========================================================
      // DUPLICATE USER CHECK
      // ========================================================

      const duplicateResult =
        await client.query(
          `
            SELECT
              booking_id

            FROM appointment_bookings

            WHERE
              appointment_date =
                $1::date

              AND slot_id =
                $2

              AND mobile =
                $3

              AND status =
                'booked'

            LIMIT 1
          `,
          [
            date,
            slotId,
            mobile,
          ],
        );

      if (
        duplicateResult.rows
          .length > 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(409).json({
          success: false,

          code:
            "DUPLICATE_BOOKING",

          message:
            "You have already booked this slot.",

          bookingId:
            duplicateResult
              .rows[0]
              .booking_id,
        });

        return;
      }

      // ========================================================
      // LIVE CURRENT COUNT
      // ========================================================

      const countResult =
        await client.query(
          `
            SELECT
              COUNT(*)::int AS booked_members

            FROM appointment_bookings

            WHERE
              appointment_date =
                $1::date

              AND slot_id =
                $2

              AND status =
                'booked'
          `,
          [
            date,
            slotId,
          ],
        );

      const bookedMembers =
        Number(
          countResult.rows[0]
            ?.booked_members ??
            0,
        );

      const availableMembers =
        Math.max(
          0,
          maxMembers -
            bookedMembers,
        );

      // ========================================================
      // FULL
      // ========================================================

      if (
        availableMembers <=
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(409).json({
          success: false,

          code:
            "SLOT_FULL",

          message:
            "This slot is full.",

          slot: {
            date,
            slotId,

            totalMembers:
              maxMembers,

            maxMembers,

            bookedMembers,

            availableMembers:
              0,

            isFull: true,
          },
        });

        return;
      }

      // ========================================================
      // BOOKING ID
      // ========================================================

      const bookingId =
        createBookingId();

      // ========================================================
      // INSERT
      // ========================================================

      const insertResult =
        await client.query(
          `
            INSERT INTO appointment_bookings (
              booking_id,
              appointment_date,
              slot_id,
              user_id,
              user_name,
              mobile,
              alternate_mobile,
              reason_type,
              notes,
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
              $8,
              $9,
              'booked',
              NOW(),
              NOW()
            )

            RETURNING
              id,
              booking_id,
              appointment_date,
              slot_id,
              user_id,
              user_name,
              mobile,
              alternate_mobile,
              reason_type,
              notes,
              status,
              created_at,
              updated_at
          `,
          [
            bookingId,
            date,
            slotId,
            userId || null,
            userName,
            mobile,
            alternateMobile,
            reasonType,
            notes,
          ],
        );

      // ========================================================
      // GET ACTUAL COUNT AFTER INSERT
      //
      // We query PostgreSQL again instead of simply doing
      // bookedMembers + 1.
      // ========================================================

      const finalCountResult =
        await client.query(
          `
            SELECT
              COUNT(*)::int AS booked_members

            FROM appointment_bookings

            WHERE
              appointment_date =
                $1::date

              AND slot_id =
                $2

              AND status =
                'booked'
          `,
          [
            date,
            slotId,
          ],
        );

      const finalBookedMembers =
        Number(
          finalCountResult
            .rows[0]
            ?.booked_members ??
            0,
        );

      const finalAvailableMembers =
        Math.max(
          0,
          maxMembers -
            finalBookedMembers,
        );

      const isFull =
        finalAvailableMembers <=
        0;

      // ========================================================
      // COMMIT
      // ========================================================

      await client.query(
        "COMMIT",
      );

      transactionStarted =
        false;

      const savedBooking =
        insertResult.rows[0];

      // ========================================================
      // RESPONSE
      // ========================================================

      res.status(201).json({
        success: true,

        message:
          "Appointment booked successfully.",

        booking: {
          id:
            savedBooking.id,

          bookingId:

            savedBooking.booking_id,

          booking_id:
            savedBooking.booking_id,

          date,

          appointmentDate:
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

          alternateMobile,

          reasonType,

          notes,

          status:
            "booked",

          maxMembers,

          totalMembers:
            maxMembers,

          bookedMembers:
            finalBookedMembers,

          availableMembers:
            finalAvailableMembers,

          isFull,

          createdAt:
            savedBooking.created_at,
        },

        totalMembers:
          maxMembers,

        bookedMembers:
          finalBookedMembers,

        availableMembers:
          finalAvailableMembers,

        isFull,
      });
    } catch (error: any) {
      // ========================================================
      // ROLLBACK
      // ========================================================

      if (
        transactionStarted
      ) {
        try {
          await client.query(
            "ROLLBACK",
          );
        } catch {
          // Ignore rollback failure
        }
      }

      console.error(
        "[CREATE APPOINTMENT ERROR]",
        error,
      );

      // ========================================================
      // UNIQUE CONFLICT
      // ========================================================

      if (
        error?.code ===
        "23505"
      ) {
        res.status(409).json({
          success: false,

          code:
            "BOOKING_CONFLICT",

          message:
            "This slot was just booked or you already have an active booking for this slot. Please refresh the slots.",
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
// GET
// /api/appointments/my?mobile=9876543210
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
        normalizeMobile(
          req.query.mobile,
        );

      if (
        !validMobile(
          mobile,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Valid mobile number is required.",
        });

        return;
      }

      const result =
        await client.query(
          `
            SELECT
              b.booking_id,

              TO_CHAR(
                b.appointment_date,
                'YYYY-MM-DD'
              ) AS date,

              b.slot_id,

              b.user_id,

              b.user_name,

              b.mobile,

              b.alternate_mobile,

              b.reason_type,

              b.notes,

              b.status,

              b.created_at,

              b.updated_at,

              s.start_time,

              s.end_time,

              s.title AS slot_title

            FROM appointment_bookings AS b

            LEFT JOIN staff_daily_availability AS a
              ON a.available_date =
                b.appointment_date

            LEFT JOIN staff_availability_slots AS s
              ON s.availability_id =
                a.id

              AND s.client_slot_id =
                b.slot_id

            WHERE
              b.mobile =
                $1

            ORDER BY
              b.appointment_date DESC,
              b.created_at DESC
          `,
          [
            mobile,
          ],
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
// POST
// /api/appointments/:bookingId/cancel
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

    let transactionStarted =
      false;

    try {
      const bookingId =
        normalizeString(
          req.params.bookingId,
        );

      const mobile =
        normalizeMobile(
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

      if (
        !validMobile(
          mobile,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Valid mobile number is required.",
        });

        return;
      }

      // ========================================================
      // START TRANSACTION
      // ========================================================

      await client.query(
        "BEGIN",
      );

      transactionStarted =
        true;

      // ========================================================
      // GET + LOCK BOOKING
      // ========================================================

      const bookingResult =
        await client.query(
          `
            SELECT
              booking_id,
              appointment_date,
              slot_id,
              status

            FROM appointment_bookings

            WHERE
              booking_id =
                $1

              AND mobile =
                $2

            LIMIT 1

            FOR UPDATE
          `,
          [
            bookingId,
            mobile,
          ],
        );

      if (
        bookingResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(404).json({
          success: false,
          message:
            "Appointment not found.",
        });

        return;
      }

      const existing =
        bookingResult.rows[0];

      if (
        existing.status !==
        "booked"
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(409).json({
          success: false,
          message:
            "This appointment is not active.",
          status:
            existing.status,
        });

        return;
      }

      // ========================================================
      // CANCEL
      // ========================================================

      const updateResult =
        await client.query(
          `
            UPDATE appointment_bookings

            SET
              status =
                'cancelled',

              updated_at =
                NOW()

            WHERE
              booking_id =
                $1

              AND mobile =
                $2

              AND status =
                'booked'

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
        updateResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        transactionStarted =
          false;

        res.status(409).json({
          success: false,
          message:
            "Appointment could not be cancelled.",
        });

        return;
      }

      // ========================================================
      // FIND SLOT CAPACITY
      // ========================================================

      const slotResult =
        await client.query(
          `
            SELECT
              s.max_members

            FROM staff_availability_slots AS s

            INNER JOIN staff_daily_availability AS a
              ON a.id =
                s.availability_id

            WHERE
              a.available_date =
                $1::date

              AND s.client_slot_id =
                $2

            LIMIT 1
          `,
          [
            existing.appointment_date,
            existing.slot_id,
          ],
        );

      const maxMembers =
        Number(
          slotResult.rows[0]
            ?.max_members ??
            0,
        );

      // ========================================================
      // CURRENT COUNT AFTER CANCEL
      // ========================================================

      const countResult =
        await client.query(
          `
            SELECT
              COUNT(*)::int AS booked_members

            FROM appointment_bookings

            WHERE
              appointment_date =
                $1::date

              AND slot_id =
                $2

              AND status =
                'booked'
          `,
          [
            existing.appointment_date,
            existing.slot_id,
          ],
        );

      const bookedMembers =
        Number(
          countResult.rows[0]
            ?.booked_members ??
            0,
        );

      const availableMembers =
        Math.max(
          0,
          maxMembers -
            bookedMembers,
        );

      // ========================================================
      // COMMIT
      // ========================================================

      await client.query(
        "COMMIT",
      );

      transactionStarted =
        false;

      // ========================================================
      // RESPONSE
      // ========================================================

      res.json({
        success: true,

        message:
          "Appointment cancelled successfully.",

        booking:
          updateResult.rows[0],

        totalMembers:
          maxMembers,

        bookedMembers,

        availableMembers,

        isFull:
          availableMembers <=
          0,
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
          // Ignore rollback failure
        }
      }

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