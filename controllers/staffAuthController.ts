
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import JanasevaStaff from "../models/JanasevaStaff";
import {
  PortalAuthenticatedRequest,
} from "../middleware/portalAuth";

const MAX_STAFF_DEVICES = 2;

/* =========================================================
   HELPERS
========================================================= */

function normalizeMobile(value: unknown): string {
  let mobile = String(value ?? "")
    .trim()
    .replace(/\D/g, "");

  if (mobile.length === 12 && mobile.startsWith("91")) {
    mobile = mobile.substring(2);
  }

  return mobile;
}

function normalizeDeviceId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9][0-9]{9}$/.test(mobile);
}

function createStaffToken(
  userId: string,
  sessionId: string,
): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId,
      role: "staff",
      sessionId,
      type: "janaseva_portal",
    },
    secret,
    {
      expiresIn: "30d",
    },
  );
}

function sendLoginSuccess(
  res: Response,
  staff: any,
  sessionId: string,
) {
  const token = createStaffToken(
    String(staff._id),
    sessionId,
  );

  return res.status(200).json({
    success: true,
    message: "Staff login successful.",
    token,
    user: {
      id: String(staff._id),
      name: staff.name,
      mobile: staff.mobile,
      designation: staff.designation,
      role: staff.role,
      isActive: staff.isActive,
      activeDevices: staff.sessions?.length ?? 0,
      maxDevices: MAX_STAFF_DEVICES,
    },
  });
}

/* =========================================================
   STAFF LOGIN
   POST /api/staff/auth/login

   Policy:
   - Maximum two active device sessions.
   - Logging in on a third device removes the oldest session.
   - The newest two sessions remain registered.
========================================================= */

export async function staffLogin(
  req: Request,
  res: Response,
): Promise<any> {
  try {
    const normalizedMobile = normalizeMobile(
      req.body?.mobile,
    );

    const password = req.body?.password;

    const normalizedDeviceId = normalizeDeviceId(
      req.body?.deviceId,
    );

    /* VALIDATION */

    if (!isValidIndianMobile(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message: "Enter a valid 10-digit Indian mobile number.",
      });
    }

    if (typeof password !== "string" || !password.trim()) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required.",
      });
    }

    if (!normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        field: "deviceId",
        message: "Device ID is required.",
      });
    }

    /* FIND STAFF */

    const staff = await JanasevaStaff.findOne({
      mobile: normalizedMobile,
      role: "staff",
      isActive: true,
    }).select("+password");

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password.",
      });
    }

    /* CHECK PASSWORD */

    const passwordMatches = await bcrypt.compare(
      password,
      staff.password,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password.",
      });
    }

    const currentSessions = staff.sessions ?? [];

    /* SAME DEVICE LOGIN */

    const existingSession = currentSessions.find(
      (session) =>
        session.deviceId === normalizedDeviceId,
    );

    if (existingSession) {
      existingSession.lastActiveAt = new Date();
      staff.lastLoginAt = new Date();

      await staff.save();

      return sendLoginSuccess(
        res,
        staff,
        existingSession.sessionId,
      );
    }

    /* CREATE A NEW DEVICE SESSION */

    const sessionId = randomUUID();
    const now = new Date();

    /*
     * Atomic update:
     * Add the new session to the end of the array.
     * Keep only the newest MAX_STAFF_DEVICES entries.
     * Older entries are removed from the database.
     *
     * This also avoids the previous hard block when
     * the account already has two device sessions.
     */

    const updatedStaff = await JanasevaStaff.findOneAndUpdate(
      {
        _id: staff._id,
        role: "staff",
        isActive: true,

        // Avoid creating a duplicate session for the same device.
        "sessions.deviceId": {
          $ne: normalizedDeviceId,
        },
      },
      {
        $push: {
          sessions: {
            $each: [
              {
                sessionId,
                deviceId: normalizedDeviceId,
                createdAt: now,
                lastActiveAt: now,
              },
            ],
            $slice: -MAX_STAFF_DEVICES,
          },
        },
        $set: {
          lastLoginAt: now,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    /* HANDLE A CONCURRENT LOGIN FROM THE SAME DEVICE */

    if (!updatedStaff) {
      const latestStaff = await JanasevaStaff.findById(
        staff._id,
      );

      if (
        latestStaff &&
        latestStaff.isActive === true &&
        latestStaff.role === "staff"
      ) {
        const sameDeviceSession =
          latestStaff.sessions?.find(
            (session) =>
              session.deviceId === normalizedDeviceId,
          );

        if (sameDeviceSession) {
          sameDeviceSession.lastActiveAt = new Date();

          await latestStaff.save();

          return sendLoginSuccess(
            res,
            latestStaff,
            sameDeviceSession.sessionId,
          );
        }
      }

      return res.status(409).json({
        success: false,
        message: "Unable to create Staff session. Please try again.",
      });
    }

    /* RETURN THE NEW DEVICE SESSION */

    return sendLoginSuccess(
      res,
      updatedStaff,
      sessionId,
    );
  } catch (error) {
    console.error("STAFF LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Staff login failed.",
    });
  }
}

/* =========================================================
   STAFF LOGOUT
   POST /api/staff/auth/logout

   Removes only the current session.
========================================================= */

export async function staffLogout(
  req: PortalAuthenticatedRequest,
  res: Response,
): Promise<any> {
  try {
    const portalUser = req.portalUser;

    if (!portalUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (portalUser.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Staff access required.",
      });
    }

    const result = await JanasevaStaff.updateOne(
      {
        _id: portalUser.userId,
        role: "staff",
      },
      {
        $pull: {
          sessions: {
            sessionId: portalUser.sessionId,
          },
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out from this device.",
    });
  } catch (error) {
    console.error("STAFF LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Staff logout failed.",
    });
  }
}
