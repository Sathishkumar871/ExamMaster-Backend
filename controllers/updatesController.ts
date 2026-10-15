
import type { Request, Response } from "express";

import {
  createUpdate,
  deleteUpdate,
  getPublicUpdates,
  getUpdateById,
  getUpdates,
  setUpdatePublished,
  updateUpdate,
} from "../models/updatesModel";

import type {
  CreateUpdateInput,
  UpdateUpdateInput,
  UpdateFilters,
} from "../models/updatesModel";

/* =========================================================
   KAMBALA SEVA — LATEST UPDATES CONTROLLER
   Database: PostgreSQL
   Model: src/models/updatesModel.ts
========================================================= */

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

/**
 * Express 5 can type route parameters as string | string[].
 * Normalize the ID before passing it to the PostgreSQL model.
 */
function getUpdateRouteId(req: Request): string {
  const id: unknown = req.params.id;

  if (typeof id === "string") {
    return id;
  }

  if (Array.isArray(id) && typeof id[0] === "string") {
    return id[0];
  }

  return "";
}

function isValidationError(message: string): boolean {
  const validationMessages = [
    "Update title is required",
    "Update description is required",
    "The title must be",
    "The description must be",
    "Invalid category",
    "Please select a valid destination page",
    "Use a valid HTTPS ImageKit URL",
    "Publication status must be",
    "Display order must be",
    "Update ID must be",
    "Request body must be a JSON object",
    "Invalid limit",
    "Invalid offset",
    "Invalid isPublished",
    "Invalid published",
  ];

  return validationMessages.some((prefix) =>
    message.startsWith(prefix),
  );
}

function sendError(
  res: Response,
  error: unknown,
  operation: string,
): void {
  const message = getErrorMessage(error);

  if (isValidationError(message)) {
    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  console.error(`[Updates Controller] ${operation}:`, error);

  res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again.`,
  });
}

function readBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new Error("Request body must be a JSON object.");
  }

  return body as Record<string, unknown>;
}

function queryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function queryNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  const raw = queryString(value);

  if (raw === undefined) return undefined;

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Invalid ${fieldName}. Use a non-negative integer.`,
    );
  }

  return parsed;
}

function queryBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  const raw = queryString(value);

  if (raw === undefined) return undefined;

  if (raw.toLowerCase() === "true") return true;
  if (raw.toLowerCase() === "false") return false;

  throw new Error(`Invalid ${fieldName}. Use true or false.`);
}

/* =========================================================
   GET /api/updates
   Admin/Staff: all drafts and published updates.
========================================================= */

export async function getUpdatesController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const status = queryString(req.query.status)?.toLowerCase();

    let isPublished = queryBoolean(
      req.query.isPublished ?? req.query.published,
      "isPublished",
    );

    if (status && status !== "all") {
      if (status === "published") {
        isPublished = true;
      } else if (status === "draft" || status === "unpublished") {
        isPublished = false;
      } else {
        res.status(400).json({
          success: false,
          message:
            "Invalid status. Use all, published, draft or unpublished.",
        });
        return;
      }
    }

    const filters: UpdateFilters = {
      category: queryString(req.query.category) as
        UpdateFilters["category"],
      isPublished,
      search: queryString(req.query.search),
      limit: queryNumber(req.query.limit, "limit"),
      offset: queryNumber(req.query.offset, "offset"),
    };

    const items = await getUpdates(filters);

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    sendError(res, error, "load updates");
  }
}

/* =========================================================
   GET /api/updates/public
   Citizen app: published updates only.
========================================================= */

export async function getPublicUpdatesController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const items = await getPublicUpdates();

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    sendError(res, error, "load public updates");
  }
}

/* =========================================================
   GET /api/updates/:id
========================================================= */

export async function getUpdateByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = getUpdateRouteId(req);
    const item = await getUpdateById(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Update not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    sendError(res, error, "load update");
  }
}

/* =========================================================
   POST /api/updates
========================================================= */

export async function createUpdateController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = readBody(req);
    const input = body as unknown as CreateUpdateInput;

    const item = await createUpdate(input);

    res.status(201).json({
      success: true,
      message: "Update created successfully.",
      item,
    });
  } catch (error) {
    sendError(res, error, "create update");
  }
}

/* =========================================================
   PUT /api/updates/:id
========================================================= */

export async function updateUpdateController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = readBody(req);
    const input = body as unknown as UpdateUpdateInput;
    const id = getUpdateRouteId(req);

    const item = await updateUpdate(id, input);

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Update not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Update saved successfully.",
      item,
    });
  } catch (error) {
    sendError(res, error, "update record");
  }
}

/* =========================================================
   PATCH /api/updates/:id/publish
   Body: { "isPublished": true | false }
========================================================= */

export async function publishUpdateController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = readBody(req);
    const isPublished = body.isPublished;

    if (typeof isPublished !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isPublished must be true or false.",
      });
      return;
    }

    const id = getUpdateRouteId(req);

    const item = await setUpdatePublished(
      id,
      isPublished,
    );

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Update not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: isPublished
        ? "Update published successfully."
        : "Update moved to drafts successfully.",
      item,
    });
  } catch (error) {
    sendError(res, error, "change publication status");
  }
}

/* =========================================================
   DELETE /api/updates/:id
========================================================= */

export async function deleteUpdateController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = getUpdateRouteId(req);
    const deleted = await deleteUpdate(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Update not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Update deleted successfully.",
    });
  } catch (error) {
    sendError(res, error, "delete update");
  }
}
