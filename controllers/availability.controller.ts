import {
  Request,
  Response,
} from "express";

import type { PoolClient } from "pg";

import pool from "../config/postgres";

// ============================================================
// TYPES
// ============================================================

type DayStatus =
  | "available"
  | "partial"
  | "leave"
  | "closed";

type SlotStatus =
  | "available"
  | "break"
  | "unavailable";

type ReasonType =
  | "hospital"
  | "sponsor"
  | "government_service"
  | "document_help"
  | "welfare_support"
  | "education_support"
  | "general_help"
  | "other";

interface StaffToken {
  id?: string;
  _id?: string;
  userId?: string;
  staffId?: string;
  name?: string;
  role?: string;
  staffRole?: string;
}

// ============================================================
// HELPERS
// ============================================================

const validDate = (
  value: string,
): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`,
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const toMinutes = (
  value: string,
): number => {
  const match =
    /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return -1;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return -1;
  }

  return hours * 60 + minutes;
};

const isDayStatus = (
  value: string,
): value is DayStatus => {
  return [
    "available",
    "partial",
    "leave",
    "closed",
  ].includes(value);
};

const isSlotStatus = (
  value: string,
): value is SlotStatus => {
  return [
    "available",
    "break",
    "unavailable",
  ].includes(value);
};

const isReasonType = (
  value: string,
): value is ReasonType => {
  return [
    "hospital",
    "sponsor",
    "government_service",
    "document_help",
    "welfare_support",
    "education_support",
    "general_help",
    "other",
  ].includes(value);
};

const normalizeString = (
  value: unknown,
  fallback = "",
): string => {
  return String(
    value ?? fallback,
  ).trim();
};

const normalizeBoolean = (
  value: unknown,
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return (
      value.toLowerCase() ===
      "true"
    );
  }

  return Boolean(value);
};

// ============================================================
// STAFF FROM REQUEST
// ============================================================

const getStaff = (
  req: Request,
): StaffToken => {
  return (
    (
      req as Request & {
        staff?: StaffToken;
      }
    ).staff || {}
  );
};

// ============================================================
// NORMALIZE SLOT
// ============================================================

const normalizeSlot = (
  raw: any,
  index: number,
) => {
  const startTime =
    normalizeString(
      raw?.startTime,
    );

  const endTime =
    normalizeString(
      raw?.endTime,
    );

  const slotStatus =
    normalizeString(
      raw?.status,
      "available",
    ).toLowerCase();

  const reasonType =
    normalizeString(
      raw?.reasonType,
      "general_help",
    ).toLowerCase();

  let maxMembers = Number(
    raw?.maxMembers ?? 0,
  );

  if (
    !Number.isFinite(
      maxMembers,
    )
  ) {
    maxMembers = 0;
  }

  maxMembers = Math.max(
    0,
    Math.floor(maxMembers),
  );

  if (
    slotStatus === "break" ||
    slotStatus ===
      "unavailable"
  ) {
    maxMembers = 0;
  }

  return {
    clientSlotId:
      normalizeString(
        raw?.id,
      ) ||
      `slot-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    startTime,
    endTime,
    slotStatus,
    maxMembers,
    reasonType,

    title: normalizeString(
      raw?.title,
    ),

    description:
      normalizeString(
        raw?.description,
      ),
  };
};

// ============================================================
// VALIDATE + SORT SLOTS
// ============================================================

const validateAndSortSlots = (
  rawSlots: any[],
) => {
  const slots =
    rawSlots.map(
      normalizeSlot,
    );

  for (
    let i = 0;
    i < slots.length;
    i += 1
  ) {
    const slot = slots[i];

    const start =
      toMinutes(
        slot.startTime,
      );

    const end =
      toMinutes(
        slot.endTime,
      );

    if (
      start < 0 ||
      end < 0
    ) {
      throw new Error(
        `Invalid time in slot ${
          i + 1
        }. Use HH:MM format.`,
      );
    }

    if (end <= start) {
      throw new Error(
        `End time must be after start time in slot ${
          i + 1
        }.`,
      );
    }

    if (
      !isSlotStatus(
        slot.slotStatus,
      )
    ) {
      throw new Error(
        `Invalid slot status in slot ${
          i + 1
        }.`,
      );
    }

    if (
      !isReasonType(
        slot.reasonType,
      )
    ) {
      throw new Error(
        `Invalid reason type in slot ${
          i + 1
        }.`,
      );
    }

    if (
      slot.slotStatus ===
        "available" &&
      slot.maxMembers < 1
    ) {
      throw new Error(
        `Available slot ${
          i + 1
        } must have at least 1 member capacity.`,
      );
    }
  }

  const sorted = [
    ...slots,
  ].sort(
    (a, b) =>
      toMinutes(
        a.startTime,
      ) -
      toMinutes(
        b.startTime,
      ),
  );

  for (
    let i = 1;
    i < sorted.length;
    i += 1
  ) {
    const previous =
      sorted[i - 1];

    const current =
      sorted[i];

    if (
      toMinutes(
        current.startTime,
      ) <
      toMinutes(
        previous.endTime,
      )
    ) {
      throw new Error(
        `Overlapping slots detected: ${previous.startTime}-${previous.endTime} and ${current.startTime}-${current.endTime}.`,
      );
    }
  }

  return sorted;
};

// ============================================================
// GET ONE DATE FROM DATABASE
// ============================================================

const getAvailabilityByDate =
  async (
    client: PoolClient,
    date: string,
  ) => {
    const dayResult =
      await client.query(
        `
          SELECT
            id,
            TO_CHAR(
              available_date,
              'YYYY-MM-DD'
            ) AS date,
            day_status,
            reason_type,
            title,
            message,
            leave_reason,
            published,
            updated_by_id,
            updated_by_name,
            updated_by_role,
            created_at,
            updated_at
          FROM staff_daily_availability
          WHERE available_date = $1::date
          LIMIT 1
        `,
        [date],
      );

    if (
      dayResult.rows.length === 0
    ) {
      return null;
    }

    const day =
      dayResult.rows[0];

    const slotsResult =
      await client.query(
        `
          SELECT
            client_slot_id AS id,
            TO_CHAR(
              start_time,
              'HH24:MI'
            ) AS start_time,
            TO_CHAR(
              end_time,
              'HH24:MI'
            ) AS end_time,
            slot_status,
            max_members,
            reason_type,
            title,
            description
          FROM staff_availability_slots
          WHERE availability_id = $1
          ORDER BY start_time ASC, id ASC
        `,
        [day.id],
      );

    return {
      date: day.date,

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

      published:
        day.published,

      slots:
        slotsResult.rows.map(
          (slot) => ({
            id: slot.id,

            startTime:
              slot.start_time,

            endTime:
              slot.end_time,

            status:
              slot.slot_status,

            maxMembers:
              slot.max_members,

            reasonType:
              slot.reason_type,

            title:
              slot.title,

            description:
              slot.description,
          }),
        ),

      updatedBy: {
        id:
          day.updated_by_id,

        name:
          day.updated_by_name,

        role:
          day.updated_by_role,
      },

      createdAt:
        day.created_at,

      updatedAt:
        day.updated_at,
    };
  };

// ============================================================
// GET ALL STAFF AVAILABILITY
// GET /api/staff/availability
// ============================================================

export const getAllAvailability =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const client =
      await pool.connect();

    try {
      const from =
        normalizeString(
          req.query.from,
        );

      const to =
        normalizeString(
          req.query.to,
        );

      if (
        from &&
        !validDate(from)
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid from date.",
        });

        return;
      }

      if (
        to &&
        !validDate(to)
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid to date.",
        });

        return;
      }

      const params: string[] =
        [];

      const conditions: string[] =
        [];

      if (from) {
        params.push(from);

        conditions.push(
          `available_date >= $${params.length}::date`,
        );
      }

      if (to) {
        params.push(to);

        conditions.push(
          `available_date <= $${params.length}::date`,
        );
      }

      const whereClause =
        conditions.length
          ? `WHERE ${conditions.join(
              " AND ",
            )}`
          : "";

      const result =
        await client.query(
          `
            SELECT
              id,
              TO_CHAR(
                available_date,
                'YYYY-MM-DD'
              ) AS date,
              day_status,
              reason_type,
              title,
              message,
              leave_reason,
              published,
              updated_by_id,
              updated_by_name,
              updated_by_role,
              created_at,
              updated_at
            FROM staff_daily_availability
            ${whereClause}
            ORDER BY available_date ASC
          `,
          params,
        );

      const availability = [];

      for (
        const day of result.rows
      ) {
        const slotsResult =
          await client.query(
            `
              SELECT
                client_slot_id AS id,
                TO_CHAR(
                  start_time,
                  'HH24:MI'
                ) AS start_time,
                TO_CHAR(
                  end_time,
                  'HH24:MI'
                ) AS end_time,
                slot_status,
                max_members,
                reason_type,
                title,
                description
              FROM staff_availability_slots
              WHERE availability_id = $1
              ORDER BY start_time ASC, id ASC
            `,
            [day.id],
          );

        availability.push({
          date: day.date,

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

          published:
            day.published,

          slots:
            slotsResult.rows.map(
              (slot) => ({
                id: slot.id,

                startTime:
                  slot.start_time,

                endTime:
                  slot.end_time,

                status:
                  slot.slot_status,

                maxMembers:
                  slot.max_members,

                reasonType:
                  slot.reason_type,

                title:
                  slot.title,

                description:
                  slot.description,
              }),
            ),

          updatedBy: {
            id:
              day.updated_by_id,

            name:
              day.updated_by_name,

            role:
              day.updated_by_role,
          },

          createdAt:
            day.created_at,

          updatedAt:
            day.updated_at,
        });
      }

      res.json({
        success: true,
        count:
          availability.length,
        availability,
      });
    } catch (error: any) {
      console.error(
        "[STAFF AVAILABILITY LIST ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// PUBLIC - GET ONE DATE
// ============================================================

export const getPublicAvailability =
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

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      const availability =
        await getAvailabilityByDate(
          client,
          date,
        );

      if (
        !availability ||
        !availability.published
      ) {
        res.json({
          success: true,
          available: false,
          availability: null,
        });

        return;
      }

      res.json({
        success: true,
        available: true,

        availability: {
          date:
            availability.date,

          dayStatus:
            availability.dayStatus,

          reasonType:
            availability.reasonType,

          title:
            availability.title,

          message:
            availability.message,

          leaveReason:
            availability.leaveReason,

          slots:
            availability.slots,

          updatedAt:
            availability.updatedAt,
        },
      });
    } catch (error: any) {
      console.error(
        "[PUBLIC AVAILABILITY ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load public availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// STAFF - GET ONE DATE
// ============================================================

export const getStaffAvailability =
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

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      const availability =
        await getAvailabilityByDate(
          client,
          date,
        );

      res.json({
        success: true,
        availability,
      });
    } catch (error: any) {
      console.error(
        "[STAFF AVAILABILITY DATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load selected date.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// CREATE / UPDATE
// PUT /api/staff/availability/:date
// ============================================================

export const saveAvailability =
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
          req.params.date,
        );

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      const dayStatus =
        normalizeString(
          req.body?.dayStatus,
          "available",
        ).toLowerCase();

      const reasonType =
        normalizeString(
          req.body?.reasonType,
          "general_help",
        ).toLowerCase();

      const title =
        normalizeString(
          req.body?.title,
        );

      const message =
        normalizeString(
          req.body?.message,
        );

      const leaveReason =
        normalizeString(
          req.body?.leaveReason,
        );

      const published =
        normalizeBoolean(
          req.body?.published,
        );

      const rawSlots =
        Array.isArray(
          req.body?.slots,
        )
          ? req.body.slots
          : [];

      if (
        !isDayStatus(
          dayStatus,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid day status.",
        });

        return;
      }

      if (
        !isReasonType(
          reasonType,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reason type.",
        });

        return;
      }

      const slots =
        validateAndSortSlots(
          rawSlots,
        );

      const staff =
        getStaff(req);

      const updatedById =
        String(
          staff.id ||
            staff._id ||
            staff.userId ||
            staff.staffId ||
            "",
        );

      const updatedByName =
        String(
          staff.name || "",
        );

      const updatedByRole =
        String(
          staff.role ||
            staff.staffRole ||
            "",
        );

      await client.query(
        "BEGIN",
      );

      transactionStarted = true;

      const dayResult =
        await client.query(
          `
            INSERT INTO staff_daily_availability (
              available_date,
              day_status,
              reason_type,
              title,
              message,
              leave_reason,
              published,
              updated_by_id,
              updated_by_name,
              updated_by_role,
              created_at,
              updated_at
            )
            VALUES (
              $1::date,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              NOW(),
              NOW()
            )
            ON CONFLICT (available_date)
            DO UPDATE SET
              day_status = EXCLUDED.day_status,
              reason_type = EXCLUDED.reason_type,
              title = EXCLUDED.title,
              message = EXCLUDED.message,
              leave_reason = EXCLUDED.leave_reason,
              published = EXCLUDED.published,
              updated_by_id = EXCLUDED.updated_by_id,
              updated_by_name = EXCLUDED.updated_by_name,
              updated_by_role = EXCLUDED.updated_by_role,
              updated_at = NOW()
            RETURNING id
          `,
          [
            date,
            dayStatus,
            reasonType,
            title,
            message,
            leaveReason,
            published,
            updatedById,
            updatedByName,
            updatedByRole,
          ],
        );

      const availabilityId =
        dayResult.rows[0].id;

      await client.query(
        `
          DELETE FROM staff_availability_slots
          WHERE availability_id = $1
        `,
        [availabilityId],
      );

      for (
        const slot of slots
      ) {
        await client.query(
          `
            INSERT INTO staff_availability_slots (
              availability_id,
              client_slot_id,
              start_time,
              end_time,
              slot_status,
              max_members,
              reason_type,
              title,
              description,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              NOW(),
              NOW()
            )
          `,
          [
            availabilityId,
            slot.clientSlotId,
            slot.startTime,
            slot.endTime,
            slot.slotStatus,
            slot.maxMembers,
            slot.reasonType,
            slot.title,
            slot.description,
          ],
        );
      }

      await client.query(
        "COMMIT",
      );

      transactionStarted = false;

      const availability =
        await getAvailabilityByDate(
          client,
          date,
        );

      res.json({
        success: true,

        message: published
          ? "Availability saved and published."
          : "Availability saved as draft.",

        availability,
      });
    } catch (error: any) {
      if (transactionStarted) {
        try {
          await client.query(
            "ROLLBACK",
          );
        } catch {
          // ignore rollback error
        }
      }

      console.error(
        "[SAVE AVAILABILITY ERROR]",
        error,
      );

      res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to save availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// PUBLISH
// POST /api/staff/availability/:date/publish
// ============================================================

export const publishAvailability =
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

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      const staff =
        getStaff(req);

      const result =
        await client.query(
          `
            UPDATE staff_daily_availability
            SET
              published = TRUE,
              updated_by_id = $2,
              updated_by_name = $3,
              updated_by_role = $4,
              updated_at = NOW()
            WHERE available_date = $1::date
            RETURNING id
          `,
          [
            date,

            String(
              staff.id ||
                staff._id ||
                staff.userId ||
                staff.staffId ||
                "",
            ),

            String(
              staff.name || "",
            ),

            String(
              staff.role ||
                staff.staffRole ||
                "",
            ),
          ],
        );

      if (
        result.rows.length === 0
      ) {
        res.status(404).json({
          success: false,
          message:
            "No availability found for this date.",
        });

        return;
      }

      const availability =
        await getAvailabilityByDate(
          client,
          date,
        );

      res.json({
        success: true,
        message:
          "Availability published successfully.",
        availability,
      });
    } catch (error: any) {
      console.error(
        "[PUBLISH AVAILABILITY ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to publish availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// UNPUBLISH
// POST /api/staff/availability/:date/unpublish
// ============================================================

export const unpublishAvailability =
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

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      const staff =
        getStaff(req);

      const result =
        await client.query(
          `
            UPDATE staff_daily_availability
            SET
              published = FALSE,
              updated_by_id = $2,
              updated_by_name = $3,
              updated_by_role = $4,
              updated_at = NOW()
            WHERE available_date = $1::date
            RETURNING id
          `,
          [
            date,

            String(
              staff.id ||
                staff._id ||
                staff.userId ||
                staff.staffId ||
                "",
            ),

            String(
              staff.name || "",
            ),

            String(
              staff.role ||
                staff.staffRole ||
                "",
            ),
          ],
        );

      if (
        result.rows.length === 0
      ) {
        res.status(404).json({
          success: false,
          message:
            "Availability not found.",
        });

        return;
      }

      const availability =
        await getAvailabilityByDate(
          client,
          date,
        );

      res.json({
        success: true,
        message:
          "Availability unpublished.",
        availability,
      });
    } catch (error: any) {
      console.error(
        "[UNPUBLISH AVAILABILITY ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to unpublish availability.",
      });
    } finally {
      client.release();
    }
  };

// ============================================================
// DELETE
// DELETE /api/staff/availability/:date
// ============================================================

export const deleteAvailability =
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

      if (!validDate(date)) {
        res.status(400).json({
          success: false,
          message:
            "Date must be YYYY-MM-DD.",
        });

        return;
      }

      await client.query(
        "BEGIN",
      );

      const result =
        await client.query(
          `
            DELETE FROM staff_daily_availability
            WHERE available_date = $1::date
            RETURNING id
          `,
          [date],
        );

      if (
        result.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(404).json({
          success: false,
          message:
            "Availability not found.",
        });

        return;
      }

      // Because SQL table has:
      // ON DELETE CASCADE
      // related slots are deleted automatically.

      await client.query(
        "COMMIT",
      );

      res.json({
        success: true,
        message:
          "Availability deleted successfully.",
      });
    } catch (error: any) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        // ignore rollback error
      }

      console.error(
        "[DELETE AVAILABILITY ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to delete availability.",
      });
    } finally {
      client.release();
    }
  };