import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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

export function portalAuth(
  req: PortalAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization token",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const decoded = jwt.verify(
      token,
      secret,
    ) as PortalJwtPayload;

    if (
      decoded.type !== "janaseva_portal" ||
      !decoded.userId ||
      !decoded.sessionId ||
      !decoded.role
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid portal token",
      });
    }

    req.portalUser = decoded;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}