import pool from "../config/postgres";
import type { QueryResultRow } from "pg";

/**
 * KAMBALA SEVA — Activities Model
 * Database: PostgreSQL
 * Table: activities
 *
 * This model is separate from community_updates.
 */

export const ACTIVITY_TYPES = [
  "sports-games",
  "meetings",
  "competitions",
  "career-guidance",
  "skills-training",
  "social-service",
  "cultural-events",
  "entrepreneurship",
  "health-fitness",
] as const;

export type ActivityType =
  (typeof ACTIVITY_TYPES)[number];

export type ActivityVisibility =
  | "village"
  | "mandal"
  | "district"
  | "all";

export type ActivityStatus =
  | "draft"
  | "published"
  | "unpublished";

export interface ActivityRecord {
  id: number;
  activityType: ActivityType;
  title: string;
  summary: string;
  description: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  visibility: ActivityVisibility;
  eventDate: string | null;
  startTime: string;
  endTime: string;
  venue: string;
  contactNumber: string;
  registrationLink: string;
  imageUrl: string;
  postedBy: string;
  postedByName: string;
  status: ActivityStatus;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityInput {
  activityType: ActivityType;
  title: string;
  summary?: string;
  description?: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  visibility?: ActivityVisibility;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string;
  contactNumber?: string;
  registrationLink?: string;
  imageUrl?: string;
  postedBy?: string;
  postedByName?: string;
  status?: ActivityStatus;
  isActive?: boolean;
  expiresAt?: string | null;
}

export type UpdateActivityInput =
  Partial<CreateActivityInput>;

export interface ActivityFilters {
  activityType?: ActivityType;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
  visibility?: ActivityVisibility;
  status?: ActivityStatus;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

interface ActivityDbRow extends QueryResultRow {
  id: number;
  activity_type: ActivityType;
  title: string;
  summary: string | null;
  description: string | null;
  state: string;
  district: string;
  mandal: string;
  village: string;
  visibility: ActivityVisibility;
  event_date: string | Date | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  contact_number: string | null;
  registration_link: string | null;
  image_url: string | null;
  posted_by: string | null;
  posted_by_name: string | null;
  status: ActivityStatus;
  is_active: boolean;
  expires_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const ACTIVITY_COLUMNS = `
  id,
  activity_type,
  title,
  summary,
  description,
  state,
  district,
  mandal,
  village,
  visibility,
  event_date,
  start_time,
  end_time,
  venue,
  contact_number,
  registration_link,
  image_url,
  posted_by,
  posted_by_name,
  status,
  is_active,
  expires_at,
  created_at,
  updated_at
`;

function cleanString(
  value: unknown,
  fallback = "",
): string {
  return String(value ?? fallback).trim();
}

function dateValue(
  value: string | Date | null | undefined,
): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function timestampValue(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "";

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function timeValue(
  value: string | null | undefined,
): string {
  return value ? String(value).slice(0, 5) : "";
}

function mapActivity(
  row: ActivityDbRow,
): ActivityRecord {
  return {
    id: Number(row.id),
    activityType: row.activity_type,
    title: row.title,
    summary: row.summary ?? "",
    description: row.description ?? "",
    state: row.state,
    district: row.district,
    mandal: row.mandal,
    village: row.village,
    visibility: row.visibility,
    eventDate: dateValue(row.event_date),
    startTime: timeValue(row.start_time),
    endTime: timeValue(row.end_time),
    venue: row.venue ?? "",
    contactNumber: row.contact_number ?? "",
    registrationLink: row.registration_link ?? "",
    imageUrl: row.image_url ?? "",
    postedBy: row.posted_by ?? "",
    postedByName: row.posted_by_name ?? "",
    status: row.status,
    isActive: Boolean(row.is_active),
    expiresAt: timestampValue(row.expires_at) || null,
    createdAt: timestampValue(row.created_at),
    updatedAt: timestampValue(row.updated_at),
  };
}

function assertValidActivityType(
  value: unknown,
): asserts value is ActivityType {
  if (
    typeof value !== "string" ||
    !ACTIVITY_TYPES.includes(value as ActivityType)
  ) {
    throw new Error(
      `Invalid activity type. Allowed types: ${ACTIVITY_TYPES.join(", ")}.`,
    );
  }
}

function assertValidId(
  value: string | number,
): number {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(
      "Activity ID must be a positive integer.",
    );
  }

  return id;
}

/* =========================================================
   CREATE ACTIVITY
========================================================= */

export async function createActivity(
  input: CreateActivityInput,
): Promise<ActivityRecord> {
  assertValidActivityType(input.activityType);

  const title = cleanString(input.title);

  if (!title) {
    throw new Error("Activity title is required.");
  }

  if (
    !cleanString(input.state) ||
    !cleanString(input.district) ||
    !cleanString(input.mandal) ||
    !cleanString(input.village)
  ) {
    throw new Error(
      "State, district, mandal and village are required.",
    );
  }

  const result = await pool.query<ActivityDbRow>(
    `
      INSERT INTO activities (
        activity_type,
        title,
        summary,
        description,
        state,
        district,
        mandal,
        village,
        visibility,
        event_date,
        start_time,
        end_time,
        venue,
        contact_number,
        registration_link,
        image_url,
        posted_by,
        posted_by_name,
        status,
        is_active,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, NULLIF($11, '')::TIME,
        NULLIF($12, '')::TIME, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        NOW(), NOW()
      )
      RETURNING ${ACTIVITY_COLUMNS}
    `,
    [
      input.activityType,
      title,
      cleanString(input.summary),
      cleanString(input.description),
      cleanString(input.state),
      cleanString(input.district),
      cleanString(input.mandal),
      cleanString(input.village),
      input.visibility ?? "village",
      input.eventDate || null,
      input.startTime || "",
      input.endTime || "",
      cleanString(input.venue),
      cleanString(input.contactNumber),
      cleanString(input.registrationLink),
      cleanString(input.imageUrl),
      cleanString(input.postedBy),
      cleanString(input.postedByName),
      input.status ?? "draft",
      input.isActive ?? true,
      input.expiresAt || null,
    ],
  );

  if (!result.rows[0]) {
    throw new Error(
      "Activity was not returned after insert.",
    );
  }

  return mapActivity(result.rows[0]);
}

/* =========================================================
   GET ACTIVITY BY ID
========================================================= */

export async function getActivityById(
  rawId: string | number,
): Promise<ActivityRecord | null> {
  const id = assertValidId(rawId);

  const result = await pool.query<ActivityDbRow>(
    `
      SELECT ${ACTIVITY_COLUMNS}
      FROM activities
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0]
    ? mapActivity(result.rows[0])
    : null;
}

/* =========================================================
   GET / FILTER ACTIVITIES
========================================================= */

export async function getActivities(
  filters: ActivityFilters = {},
): Promise<ActivityRecord[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  const addFilter = (
    column: string,
    value: unknown,
  ) => {
    values.push(value);
    clauses.push(`${column} = $${values.length}`);
  };

  if (filters.activityType) {
    assertValidActivityType(filters.activityType);

    addFilter(
      "activity_type",
      filters.activityType,
    );
  }

  if (filters.state?.trim()) {
    addFilter(
      "LOWER(state)",
      filters.state.trim().toLowerCase(),
    );
  }

  if (filters.district?.trim()) {
    addFilter(
      "LOWER(district)",
      filters.district.trim().toLowerCase(),
    );
  }

  if (filters.mandal?.trim()) {
    addFilter(
      "LOWER(mandal)",
      filters.mandal.trim().toLowerCase(),
    );
  }

  if (filters.village?.trim()) {
    addFilter(
      "LOWER(village)",
      filters.village.trim().toLowerCase(),
    );
  }

  if (filters.visibility) {
    addFilter("visibility", filters.visibility);
  }

  if (filters.status) {
    addFilter("status", filters.status);
  }

  if (typeof filters.isActive === "boolean") {
    addFilter("is_active", filters.isActive);
  }

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    const n = values.length;

    clauses.push(`
      (
        title ILIKE $${n}
        OR COALESCE(summary, '') ILIKE $${n}
        OR COALESCE(description, '') ILIKE $${n}
        OR COALESCE(venue, '') ILIKE $${n}
        OR village ILIKE $${n}
        OR mandal ILIKE $${n}
        OR district ILIKE $${n}
      )
    `);
  }

  const limit = Math.min(
    200,
    Math.max(
      1,
      Math.floor(Number(filters.limit) || 100),
    ),
  );

  const offset = Math.max(
    0,
    Math.floor(Number(filters.offset) || 0),
  );

  values.push(limit);
  const limitPosition = values.length;

  values.push(offset);
  const offsetPosition = values.length;

  const where = clauses.length
    ? `WHERE ${clauses.join(" AND ")}`
    : "";

  const result = await pool.query<ActivityDbRow>(
    `
      SELECT ${ACTIVITY_COLUMNS}
      FROM activities
      ${where}
      ORDER BY
        event_date ASC NULLS LAST,
        start_time ASC NULLS LAST,
        created_at DESC
      LIMIT $${limitPosition}
      OFFSET $${offsetPosition}
    `,
    values,
  );

  return result.rows.map(mapActivity);
}

/* =========================================================
   UPDATE ACTIVITY
========================================================= */

export async function updateActivity(
  rawId: string | number,
  input: UpdateActivityInput,
): Promise<ActivityRecord | null> {
  const id = assertValidId(rawId);

  if (input.activityType !== undefined) {
    assertValidActivityType(input.activityType);
  }

  if (
    input.title !== undefined &&
    !cleanString(input.title)
  ) {
    throw new Error(
      "Activity title cannot be empty.",
    );
  }

  const columnMap: Partial<
    Record<keyof UpdateActivityInput, string>
  > = {
    activityType: "activity_type",
    title: "title",
    summary: "summary",
    description: "description",
    state: "state",
    district: "district",
    mandal: "mandal",
    village: "village",
    visibility: "visibility",
    eventDate: "event_date",
    startTime: "start_time",
    endTime: "end_time",
    venue: "venue",
    contactNumber: "contact_number",
    registrationLink: "registration_link",
    imageUrl: "image_url",
    postedBy: "posted_by",
    postedByName: "posted_by_name",
    status: "status",
    isActive: "is_active",
    expiresAt: "expires_at",
  };

  const entries = Object.entries(input).filter(
    ([key, value]) =>
      value !== undefined && key in columnMap,
  ) as Array<
    [keyof UpdateActivityInput, unknown]
  >;

  if (entries.length === 0) {
    return getActivityById(id);
  }

  const values: unknown[] = [];

  const setClauses = entries.map(
    ([key, rawValue]) => {
      let value = rawValue;

      if (
        [
          "title",
          "summary",
          "description",
          "state",
          "district",
          "mandal",
          "village",
          "venue",
          "contactNumber",
          "registrationLink",
          "imageUrl",
          "postedBy",
          "postedByName",
        ].includes(String(key))
      ) {
        value =
          rawValue == null
            ? ""
            : String(rawValue).trim();
      }

      if (
        key === "startTime" ||
        key === "endTime"
      ) {
        values.push(value || "");

        return `${columnMap[key]} = NULLIF($${values.length}, '')::TIME`;
      }

      values.push(value === "" ? null : value);

      return `${columnMap[key]} = $${values.length}`;
    },
  );

  values.push(id);
  const idPosition = values.length;

  const result = await pool.query<ActivityDbRow>(
    `
      UPDATE activities
      SET ${setClauses.join(", ")},
          updated_at = NOW()
      WHERE id = $${idPosition}
      RETURNING ${ACTIVITY_COLUMNS}
    `,
    values,
  );

  return result.rows[0]
    ? mapActivity(result.rows[0])
    : null;
}

/* =========================================================
   DELETE ACTIVITY
========================================================= */

export async function deleteActivity(
  rawId: string | number,
): Promise<boolean> {
  const id = assertValidId(rawId);

  const result = await pool.query(
    `
      DELETE FROM activities
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

/* =========================================================
   PUBLISH / UNPUBLISH
========================================================= */

export async function setActivityStatus(
  rawId: string | number,
  status: ActivityStatus,
  isActive = status === "published",
): Promise<ActivityRecord | null> {
  const id = assertValidId(rawId);

  const result = await pool.query<ActivityDbRow>(
    `
      UPDATE activities
      SET status = $1,
          is_active = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING ${ACTIVITY_COLUMNS}
    `,
    [status, isActive, id],
  );

  return result.rows[0]
    ? mapActivity(result.rows[0])
    : null;
}