
import pool from "../config/postgres";
import type { QueryResultRow } from "pg";

/* =========================================================
   KAMBALA SEVA — LATEST UPDATES MODEL
   Database: PostgreSQL
   Table: public.portal_updates
========================================================= */

export const UPDATE_CATEGORIES = [
  "ANNOUNCEMENTS",
  "COMMUNITY",
  "EVENTS",
  "Help",
  "MEETINGS",
  "WELFARE",
] as const;

export type UpdateCategory = (typeof UPDATE_CATEGORIES)[number];

export interface UpdateRecord {
  id: number;
  title: string;
  description: string;
  category: UpdateCategory;
  imageUrl: string;
  targetRoute: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUpdateInput {
  title: string;
  description: string;
  category: UpdateCategory;
  imageUrl?: string;
  targetRoute: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export type UpdateUpdateInput = Partial<CreateUpdateInput>;

export interface UpdateFilters {
  category?: UpdateCategory;
  isPublished?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * PostgreSQL BIGSERIAL IDs are commonly returned as strings
 * by node-postgres. Accept both representations safely.
 */
interface UpdateDbRow extends QueryResultRow {
  id: string | number;
  title: string;
  description: string;
  category: UpdateCategory;
  image_url: string | null;
  target_route: string;
  is_published: boolean;
  display_order: number;
  created_at: string | Date;
  updated_at: string | Date;
}

const UPDATE_COLUMNS = `
  id,
  title,
  description,
  category,
  image_url,
  target_route,
  is_published,
  display_order,
  created_at,
  updated_at
`;

const ALLOWED_ROUTES = [
  "/updates",
  "/community",
  "/explore",
  "/services",
  "/opportunities",
  "/college",
] as const;

/* =========================================================
   HELPERS & VALIDATION
========================================================= */

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function timestampValue(value: string | Date): string {
  return value instanceof Date
    ? value.toISOString()
    : String(value);
}

function mapUpdate(row: UpdateDbRow): UpdateRecord {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url ?? "",
    targetRoute: row.target_route,
    isPublished: Boolean(row.is_published),
    displayOrder: Number(row.display_order),
    createdAt: timestampValue(row.created_at),
    updatedAt: timestampValue(row.updated_at),
  };
}

function assertValidId(rawId: string | number): number {
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Update ID must be a positive integer.");
  }

  return id;
}

function assertValidCategory(
  value: unknown,
): asserts value is UpdateCategory {
  if (
    typeof value !== "string" ||
    !UPDATE_CATEGORIES.includes(value as UpdateCategory)
  ) {
    throw new Error(
      `Invalid category. Allowed categories: ${UPDATE_CATEGORIES.join(", ")}.`,
    );
  }
}

function assertValidTargetRoute(
  value: unknown,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !ALLOWED_ROUTES.includes(
      value as (typeof ALLOWED_ROUTES)[number],
    )
  ) {
    throw new Error("Please select a valid destination page.");
  }
}

function validateImageUrl(value: unknown): string {
  const imageUrl = cleanString(value);

  // Image is optional, but a supplied URL must use HTTPS
  // and an ImageKit hostname.
  if (!imageUrl) return "";

  try {
    const url = new URL(imageUrl);
    const hostname = url.hostname.toLowerCase();

    const isImageKitHost =
      hostname === "imagekit.io" ||
      hostname.endsWith(".imagekit.io");

    if (url.protocol !== "https:" || !isImageKitHost) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(
      "Use a valid HTTPS ImageKit URL, such as https://ik.imagekit.io/your_id/image.jpg.",
    );
  }
}

function validateTitle(value: unknown): string {
  const title = cleanString(value);

  if (!title) {
    throw new Error("Update title is required.");
  }

  if (title.length > 180) {
    throw new Error("The title must be 180 characters or fewer.");
  }

  return title;
}

function validateDescription(value: unknown): string {
  const description = cleanString(value);

  if (!description) {
    throw new Error("Update description is required.");
  }

  if (description.length > 1500) {
    throw new Error(
      "The description must be 1,500 characters or fewer.",
    );
  }

  return description;
}

function validateDisplayOrder(value: unknown): number {
  const order = Number(value ?? 1);

  if (!Number.isInteger(order) || order < 1 || order > 9999) {
    throw new Error(
      "Display order must be an integer between 1 and 9999.",
    );
  }

  return order;
}

/* =========================================================
   CREATE UPDATE
========================================================= */

export async function createUpdate(
  input: CreateUpdateInput,
): Promise<UpdateRecord> {
  const title = validateTitle(input.title);
  const description = validateDescription(input.description);
  const category = input.category ?? "COMMUNITY";

  assertValidCategory(category);
  assertValidTargetRoute(input.targetRoute);

  if (
    input.isPublished !== undefined &&
    typeof input.isPublished !== "boolean"
  ) {
    throw new Error(
      "Publication status must be true or false.",
    );
  }

  const result = await pool.query<UpdateDbRow>(
    `
      INSERT INTO public.portal_updates (
        title,
        description,
        category,
        image_url,
        target_route,
        is_published,
        display_order,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING ${UPDATE_COLUMNS}
    `,
    [
      title,
      description,
      category,
      validateImageUrl(input.imageUrl),
      input.targetRoute,
      input.isPublished ?? false,
      validateDisplayOrder(input.displayOrder),
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Update was not returned after creation.");
  }

  return mapUpdate(result.rows[0]);
}

/* =========================================================
   GET UPDATE BY ID
========================================================= */

export async function getUpdateById(
  rawId: string | number,
): Promise<UpdateRecord | null> {
  const id = assertValidId(rawId);

  const result = await pool.query<UpdateDbRow>(
    `
      SELECT ${UPDATE_COLUMNS}
      FROM public.portal_updates
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0]
    ? mapUpdate(result.rows[0])
    : null;
}

/* =========================================================
   GET / FILTER ADMIN UPDATES
========================================================= */

export async function getUpdates(
  filters: UpdateFilters = {},
): Promise<UpdateRecord[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.category !== undefined) {
    assertValidCategory(filters.category);

    values.push(filters.category);
    clauses.push(`category = $${values.length}`);
  }

  if (typeof filters.isPublished === "boolean") {
    values.push(filters.isPublished);
    clauses.push(`is_published = $${values.length}`);
  }

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    const position = values.length;

    clauses.push(`
      (
        title ILIKE $${position}
        OR description ILIKE $${position}
        OR category ILIKE $${position}
        OR target_route ILIKE $${position}
      )
    `);
  }

  const limit = Math.min(
    500,
    Math.max(
      1,
      Math.floor(Number(filters.limit) || 200),
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

  const whereClause = clauses.length
    ? `WHERE ${clauses.join(" AND ")}`
    : "";

  const result = await pool.query<UpdateDbRow>(
    `
      SELECT ${UPDATE_COLUMNS}
      FROM public.portal_updates
      ${whereClause}
      ORDER BY display_order ASC, updated_at DESC
      LIMIT $${limitPosition}
      OFFSET $${offsetPosition}
    `,
    values,
  );

  return result.rows.map(mapUpdate);
}

/* =========================================================
   GET PUBLIC / PUBLISHED UPDATES
   Citizen app: published records only.
========================================================= */

export async function getPublicUpdates(): Promise<UpdateRecord[]> {
  return getUpdates({
    isPublished: true,
    limit: 200,
    offset: 0,
  });
}

/* =========================================================
   EDIT UPDATE
========================================================= */

export async function updateUpdate(
  rawId: string | number,
  input: UpdateUpdateInput,
): Promise<UpdateRecord | null> {
  const id = assertValidId(rawId);

  // Explicit allowlist of database columns.
  // Never use request-supplied keys directly in SQL.
  const columnMap: Record<keyof UpdateUpdateInput, string> = {
    title: "title",
    description: "description",
    category: "category",
    imageUrl: "image_url",
    targetRoute: "target_route",
    isPublished: "is_published",
    displayOrder: "display_order",
  };

  const entries = Object.entries(input).filter(
    ([key, value]) =>
      value !== undefined &&
      Object.prototype.hasOwnProperty.call(columnMap, key),
  ) as Array<[keyof UpdateUpdateInput, unknown]>;

  if (entries.length === 0) {
    return getUpdateById(id);
  }

  const values: unknown[] = [];

  const setClauses = entries.map(([key, rawValue]) => {
    let value = rawValue;

    switch (key) {
      case "title":
        value = validateTitle(rawValue);
        break;

      case "description":
        value = validateDescription(rawValue);
        break;

      case "category":
        assertValidCategory(rawValue);
        value = rawValue;
        break;

      case "imageUrl":
        value = validateImageUrl(rawValue);
        break;

      case "targetRoute":
        assertValidTargetRoute(rawValue);
        value = rawValue;
        break;

      case "isPublished":
        if (typeof rawValue !== "boolean") {
          throw new Error(
            "Publication status must be true or false.",
          );
        }

        value = rawValue;
        break;

      case "displayOrder":
        value = validateDisplayOrder(rawValue);
        break;
    }

    values.push(value);

    return `${columnMap[key]} = $${values.length}`;
  });

  values.push(id);
  const idPosition = values.length;

  const result = await pool.query<UpdateDbRow>(
    `
      UPDATE public.portal_updates
      SET ${setClauses.join(", ")},
          updated_at = NOW()
      WHERE id = $${idPosition}
      RETURNING ${UPDATE_COLUMNS}
    `,
    values,
  );

  return result.rows[0]
    ? mapUpdate(result.rows[0])
    : null;
}

/* =========================================================
   PUBLISH / UNPUBLISH
========================================================= */

export async function setUpdatePublished(
  rawId: string | number,
  isPublished: boolean,
): Promise<UpdateRecord | null> {
  const id = assertValidId(rawId);

  if (typeof isPublished !== "boolean") {
    throw new Error(
      "Publication status must be true or false.",
    );
  }

  const result = await pool.query<UpdateDbRow>(
    `
      UPDATE public.portal_updates
      SET is_published = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING ${UPDATE_COLUMNS}
    `,
    [isPublished, id],
  );

  return result.rows[0]
    ? mapUpdate(result.rows[0])
    : null;
}

/* =========================================================
   DELETE UPDATE
========================================================= */

export async function deleteUpdate(
  rawId: string | number,
): Promise<boolean> {
  const id = assertValidId(rawId);

  const result = await pool.query(
    `
      DELETE FROM public.portal_updates
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}
