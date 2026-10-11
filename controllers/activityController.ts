import type { Request, Response } from "express";

import {
  ACTIVITY_TYPES,
  createActivity as createActivityRecord,
  deleteActivity as deleteActivityRecord,
  getActivities as getActivityRecords,
  getActivityById,
  setActivityStatus,
  updateActivity as updateActivityRecord,
} from "../models/activityModel";

import type {
  ActivityFilters,
  ActivityRecord,
  ActivityStatus,
  ActivityType,
  ActivityVisibility,
  CreateActivityInput,
  UpdateActivityInput,
} from "../models/activityModel";

/* ============================================================
   REQUEST IDENTITY
   activityRoutes.ts must authenticate the request and attach the
   verified JWT payload to req.volunteer (or req.user).
============================================================ */

interface IdentityPart {
  id?: string | number;
  _id?: string | number;
  userId?: string | number;
  volunteerId?: string | number;
  staffId?: string | number;
  name?: string;
  role?: string;
  staffRole?: string;
  volunteer?: IdentityPart;
  user?: IdentityPart;
}

type ActivityRequest = Request & {
  volunteer?: IdentityPart;
  user?: IdentityPart;
};

interface Actor {
  id: string;
  name: string;
  role: string;
}

function getActor(req: Request): Actor {
  const activityReq = req as ActivityRequest;
  const payload = activityReq.volunteer ?? activityReq.user ?? {};
  const nested = payload.volunteer ?? payload.user ?? {};
  const id =
    payload.id ??
    payload._id ??
    payload.userId ??
    payload.volunteerId ??
    payload.staffId ??
    nested.id ??
    nested._id ??
    nested.userId ??
    nested.volunteerId ??
    "";

  return {
    id: String(id).trim(),
    name: String(payload.name ?? nested.name ?? "Volunteer").trim(),
    role: String(payload.role ?? payload.staffRole ?? nested.role ?? "volunteer")
      .trim()
      .toLowerCase(),
  };
}

const PRIVILEGED_ROLES = new Set([
  "admin",
  "staff",
  "mentor",
  "manager",
  "head",
]);

const VISIBILITIES: ActivityVisibility[] = [
  "village",
  "mandal",
  "district",
  "all",
];

const STATUSES: ActivityStatus[] = [
  "draft",
  "published",
  "unpublished",
];

function text(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: string): boolean {
  if (!value) return true;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  return hours <= 23 && minutes <= 59 && seconds <= 59;
}

function validHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return undefined;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function sendError(res: Response, error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;
  console.error("[ACTIVITY API ERROR]", error);
  res.status(500).json({ success: false, message: fallback });
}

/**
 * Accept only the API fields this module owns. The actor/owner fields are
 * assigned from the verified token, never trusted from req.body.
 */
function normalizeBody(
  rawBody: unknown,
  partial: boolean,
): { data?: UpdateActivityInput; error?: string } {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { error: "Request body must be a JSON object." };
  }

  const body = rawBody as Record<string, unknown>;
  const data: UpdateActivityInput = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has("activityType")) {
    const activityType = text(body.activityType) as ActivityType;
    if (!ACTIVITY_TYPES.includes(activityType)) {
      return {
        error: `Invalid activityType. Allowed values: ${ACTIVITY_TYPES.join(", ")}.`,
      };
    }
    data.activityType = activityType;
  }

  if (!partial || has("title")) {
    const title = text(body.title);
    if (!title) return { error: "Activity title is required." };
    if (title.length > 180) return { error: "Title must be 180 characters or fewer." };
    data.title = title;
  }

  const stringFields = [
    "summary",
    "description",
    "state",
    "district",
    "mandal",
    "village",
    "venue",
    "contactNumber",
    "imageUrl",
  ] as const;

  for (const field of stringFields) {
    if (!partial || has(field)) {
      const value = text(body[field]);
      (data as unknown as Record<string, unknown>)[field] = value;
    }
  }

  if (!partial) {
    for (const field of ["state", "district", "mandal", "village"] as const) {
      if (!text(body[field])) {
        return { error: `${field[0].toUpperCase()}${field.slice(1)} is required.` };
      }
    }
  } else {
    for (const field of ["state", "district", "mandal", "village"] as const) {
      if (has(field) && !text(body[field])) {
        return { error: `${field[0].toUpperCase()}${field.slice(1)} cannot be empty.` };
      }
    }
  }

  // Accept both the new registrationLink field and old externalLink payloads.
  if (!partial || has("registrationLink") || has("externalLink")) {
    const link = text(body.registrationLink ?? body.externalLink);
    if (!validHttpUrl(link)) {
      return { error: "Registration link must start with http:// or https://." };
    }
    data.registrationLink = link;
  }

  if (!partial || has("visibility")) {
    const visibility = text(body.visibility, "village") as ActivityVisibility;
    if (!VISIBILITIES.includes(visibility)) {
      return { error: "Visibility must be village, mandal, district or all." };
    }
    data.visibility = visibility;
  }

  if (!partial || has("eventDate")) {
    const eventDate = text(body.eventDate);
    if (eventDate && !validDate(eventDate)) {
      return { error: "eventDate must use YYYY-MM-DD format." };
    }
    data.eventDate = eventDate || null;
  }

  for (const field of ["startTime", "endTime"] as const) {
    if (!partial || has(field)) {
      const value = text(body[field]);
      if (!validTime(value)) {
        return { error: `${field} must use HH:MM format.` };
      }
      data[field] = value || null;
    }
  }

  if (has("startTime") || has("endTime") || !partial) {
    const start = text(body.startTime);
    const end = text(body.endTime);
    if (start && end && end <= start) {
      return { error: "End time must be later than start time." };
    }
  }

  if (!partial || has("status")) {
    const status = text(body.status, "draft") as ActivityStatus;
    if (!STATUSES.includes(status)) {
      return { error: "Status must be draft, published or unpublished." };
    }
    data.status = status;
  }

  if (has("isActive")) {
    const isActive = parseOptionalBoolean(body.isActive);
    if (isActive === undefined) {
      return { error: "isActive must be true or false." };
    }
    data.isActive = isActive;
  } else if (!partial) {
    data.isActive = true;
  }

  if (!partial || has("expiresAt")) {
    const expiresAt = text(body.expiresAt);
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      return { error: "expiresAt must be a valid date/time." };
    }
    data.expiresAt = expiresAt || null;
  }

  return { data };
}

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ success: false, message: "Invalid activity ID." });
    return null;
  }
  return id;
}

async function ensureCanManage(
  req: Request,
  res: Response,
  id: number,
): Promise<ActivityRecord | null | undefined> {
  const actor = getActor(req);
  if (!actor.id) {
    res.status(401).json({ success: false, message: "Authenticated account ID is missing from the token." });
    return undefined;
  }

  const activity = await getActivityById(id);
  if (!activity) {
    res.status(404).json({ success: false, message: "Activity not found." });
    return undefined;
  }

  if (!PRIVILEGED_ROLES.has(actor.role) && activity.postedBy !== actor.id) {
    res.status(403).json({ success: false, message: "You can only manage activities posted by your account." });
    return undefined;
  }

  return activity;
}

/* ============================================================
   CREATE
   POST /api/activities
============================================================ */
export async function createActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = getActor(req);
  if (!actor.id) {
    res.status(401).json({ success: false, message: "Authenticated account ID is missing from the token." });
    return;
  }

  const normalized = normalizeBody(req.body, false);
  if (normalized.error || !normalized.data) {
    res.status(400).json({ success: false, message: normalized.error || "Invalid activity data." });
    return;
  }

  try {
    const activity = await createActivityRecord({
      ...(normalized.data as CreateActivityInput),
      postedBy: actor.id,
      postedByName: actor.name || "Volunteer",
    });

    res.status(201).json({
      success: true,
      message: activity.status === "published"
        ? "Activity created and published."
        : "Activity saved successfully.",
      activity,
    });
  } catch (error) {
    sendError(res, error, "Unable to save activity to PostgreSQL.");
  }
}

/* ============================================================
   LIST FOR MANAGEMENT
   GET /api/activities
============================================================ */
export async function listActivities(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = getActor(req);
  if (!actor.id) {
    res.status(401).json({ success: false, message: "Authenticated account ID is missing from the token." });
    return;
  }

  const query = req.query;
  const rawType = text(query.activityType);
  if (rawType && !ACTIVITY_TYPES.includes(rawType as ActivityType)) {
    res.status(400).json({ success: false, message: "Invalid activityType filter." });
    return;
  }

  const rawVisibility = text(query.visibility);
  if (rawVisibility && !VISIBILITIES.includes(rawVisibility as ActivityVisibility)) {
    res.status(400).json({ success: false, message: "Invalid visibility filter." });
    return;
  }

  const rawStatus = text(query.status);
  if (rawStatus && !STATUSES.includes(rawStatus as ActivityStatus)) {
    res.status(400).json({ success: false, message: "Invalid status filter." });
    return;
  }

  const rawActive = query.isActive === undefined
    ? undefined
    : parseOptionalBoolean(String(query.isActive));
  if (query.isActive !== undefined && rawActive === undefined) {
    res.status(400).json({ success: false, message: "isActive filter must be true or false." });
    return;
  }

  const filters: ActivityFilters & { postedBy?: string } = {
    activityType: rawType ? rawType as ActivityType : undefined,
    state: text(query.state) || undefined,
    district: text(query.district) || undefined,
    mandal: text(query.mandal) || undefined,
    village: text(query.village) || undefined,
    visibility: rawVisibility ? rawVisibility as ActivityVisibility : undefined,
    status: rawStatus ? rawStatus as ActivityStatus : undefined,
    isActive: rawActive,
    search: text(query.search) || undefined,
    limit: parsePositiveInteger(query.limit, 100),
    offset: parsePositiveInteger(query.offset, 0),
  };

  // Regular volunteers see/manage their own drafts. Privileged staff/admin
  // can view all records; route middleware must restrict who can use those roles.
  if (!PRIVILEGED_ROLES.has(actor.role)) {
    filters.postedBy = actor.id;
  }

  try {
    const activities = await getActivityRecords(filters);
    res.json({ success: true, total: activities.length, activities });
  } catch (error) {
    sendError(res, error, "Unable to load activities from PostgreSQL.");
  }
}

/* ============================================================
   PUBLIC LIST
   GET /api/activities/public
============================================================ */
export async function listPublicActivities(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query;
  const rawType = text(query.activityType);

  if (rawType && !ACTIVITY_TYPES.includes(rawType as ActivityType)) {
    res.status(400).json({ success: false, message: "Invalid activityType filter." });
    return;
  }

  try {
    const activities = await getActivityRecords({
      activityType: rawType ? rawType as ActivityType : undefined,
      state: text(query.state) || undefined,
      district: text(query.district) || undefined,
      mandal: text(query.mandal) || undefined,
      village: text(query.village) || undefined,
      search: text(query.search) || undefined,
      status: "published",
      isActive: true,
      visibility: undefined,
      limit: parsePositiveInteger(query.limit, 100),
      offset: parsePositiveInteger(query.offset, 0),
    });

    res.json({ success: true, total: activities.length, activities });
  } catch (error) {
    sendError(res, error, "Unable to load published activities.");
  }
}

/* ============================================================
   GET ONE
   GET /api/activities/:id
============================================================ */
export async function getActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseId(req, res);
  if (id === null) return;

  const actor = getActor(req);
  if (!actor.id) {
    res.status(401).json({ success: false, message: "Authenticated account ID is missing from the token." });
    return;
  }

  try {
    const activity = await getActivityById(id);
    if (!activity) {
      res.status(404).json({ success: false, message: "Activity not found." });
      return;
    }

    if (!PRIVILEGED_ROLES.has(actor.role) && activity.postedBy !== actor.id) {
      res.status(403).json({ success: false, message: "You cannot access this draft/activity." });
      return;
    }

    res.json({ success: true, activity });
  } catch (error) {
    sendError(res, error, "Unable to load activity.");
  }
}

/* ============================================================
   UPDATE
   PUT /api/activities/:id
============================================================ */
export async function updateActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseId(req, res);
  if (id === null) return;

  const normalized = normalizeBody(req.body, true);
  if (normalized.error || !normalized.data) {
    res.status(400).json({ success: false, message: normalized.error || "Invalid activity data." });
    return;
  }

  try {
    const existing = await ensureCanManage(req, res, id);
    if (!existing) return;

    const activity = await updateActivityRecord(id, normalized.data as UpdateActivityInput);
    if (!activity) {
      res.status(404).json({ success: false, message: "Activity not found." });
      return;
    }

    res.json({ success: true, message: "Activity updated successfully.", activity });
  } catch (error) {
    sendError(res, error, "Unable to update activity in PostgreSQL.");
  }
}

/* ============================================================
   DELETE
   DELETE /api/activities/:id
============================================================ */
export async function deleteActivity(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const existing = await ensureCanManage(req, res, id);
    if (!existing) return;

    const deleted = await deleteActivityRecord(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Activity not found." });
      return;
    }

    res.json({ success: true, message: "Activity deleted successfully." });
  } catch (error) {
    sendError(res, error, "Unable to delete activity from PostgreSQL.");
  }
}

/* ============================================================
   PUBLISH
   PATCH /api/activities/:id/publish
============================================================ */
export async function publishActivity(
  req: Request,
  res: Response,
): Promise<void> {
  await changeActivityStatus(req, res, "published", true);
}

/* ============================================================
   UNPUBLISH
   PATCH /api/activities/:id/unpublish
============================================================ */
export async function unpublishActivity(
  req: Request,
  res: Response,
): Promise<void> {
  await changeActivityStatus(req, res, "unpublished", false);
}

async function changeActivityStatus(
  req: Request,
  res: Response,
  status: ActivityStatus,
  isActive: boolean,
): Promise<void> {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const existing = await ensureCanManage(req, res, id);
    if (!existing) return;

    const activity = await setActivityStatus(id, status, isActive);
    if (!activity) {
      res.status(404).json({ success: false, message: "Activity not found." });
      return;
    }

    res.json({
      success: true,
      message: status === "published"
        ? "Activity published successfully."
        : "Activity unpublished successfully.",
      activity,
    });
  } catch (error) {
    sendError(res, error, "Unable to change activity status.");
  }
}
