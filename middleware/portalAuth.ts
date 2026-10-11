import {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

import JanasevaStaff from "../models/JanasevaStaff";

/* =========================================================
   TYPES
========================================================= */

export interface PortalJwtPayload {
  userId: string;
  role: "admin" | "staff";
  sessionId: string;
  type: "janaseva_portal";
}

export interface PortalAuthenticatedRequest
  extends Request {
  portalUser?: PortalJwtPayload;
}

/* =========================================================
   PORTAL AUTH MIDDLEWARE

   Staff:
   - Verify JWT.
   - Verify that sessionId still exists in MongoDB.
   - Reject sessions removed after a newer device login.

   Admin:
   - Preserve the existing JWT authentication behaviour.
========================================================= */

export async function portalAuth(
  req: PortalAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  /* AUTHORIZATION HEADER */

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      code: "AUTH_TOKEN_REQUIRED",
      message: "Authorization token required.",
    });

    return;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      code: "INVALID_AUTH_TOKEN",
      message: "Invalid authorization token.",
    });

    return;
  }

  /* JWT SECRET */

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error(
      "JWT_SECRET is not configured.",
    );

    res.status(500).json({
      success: false,
      message:
        "Server authentication configuration error.",
    });

    return;
  }

  /* VERIFY JWT */

  let decoded: PortalJwtPayload;

  try {
    const verified = jwt.verify(token, secret);

    if (
      typeof verified !== "object" ||
      verified === null
    ) {
      res.status(401).json({
        success: false,
        code: "INVALID_PORTAL_TOKEN",
        message: "Invalid portal token.",
      });

      return;
    }

    decoded = verified as unknown as PortalJwtPayload;
  } catch {
    res.status(401).json({
      success: false,
      code: "INVALID_OR_EXPIRED_TOKEN",
      message: "Invalid or expired token. Please log in again.",
    });

    return;
  }

  /* VALIDATE TOKEN PAYLOAD */

  if (
    decoded.type !== "janaseva_portal" ||
    !decoded.userId ||
    !decoded.sessionId ||
    (
      decoded.role !== "staff" &&
      decoded.role !== "admin"
    )
  ) {
    res.status(401).json({
      success: false,
      code: "INVALID_PORTAL_TOKEN",
      message: "Invalid portal token.",
    });

    return;
  }

  /* =======================================================
     STAFF SESSION VALIDATION

     Important:
     A JWT can still be cryptographically valid after its
     session is removed from MongoDB. Check the database too.
  ======================================================= */

  if (decoded.role === "staff") {
    let activeSession: { _id: unknown } | null;

    try {
      activeSession = await JanasevaStaff.findOne({
        _id: decoded.userId,
        role: "staff",
        isActive: true,
        "sessions.sessionId": decoded.sessionId,
      })
        .select("_id")
        .lean();
    } catch (error) {
      console.error(
        "STAFF SESSION VALIDATION ERROR:",
        error,
      );

      res.status(503).json({
        success: false,
        code: "STAFF_SESSION_CHECK_FAILED",
        message:
          "Unable to verify your staff session. Please try again.",
      });

      return;
    }

    /* SESSION REMOVED, ACCOUNT INACTIVE OR USER NOT FOUND */

    if (!activeSession) {
      res.status(401).json({
        success: false,
        code: "STAFF_SESSION_REPLACED",
        message:
          "Your staff session is no longer active. Please log in again.",
      });

      return;
    }
  }

  /* AUTHENTICATED */

  req.portalUser = decoded;

  next();
}