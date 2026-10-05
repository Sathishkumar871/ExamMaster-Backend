
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

function normalizeMobile(
  value: unknown,
): string {
  let mobile = String(value ?? "")
    .trim()
    .replace(/\D/g, "");

  if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.substring(2);
  }

  return mobile;
}

function normalizeDeviceId(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidIndianMobile(
  mobile: string,
): boolean {
  return /^[6-9][0-9]{9}$/.test(
    mobile,
  );
}

function createStaffToken(
  userId: string,
  sessionId: string,
) {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured",
    );
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

/* =========================================================
   STAFF LOGIN
   POST /api/staff/auth/login
========================================================= */

export async function staffLogin(
  req: Request,
  res: Response,
) {
  try {
    const {
      mobile,
      password,
      deviceId,
    } = req.body;

    const normalizedMobile =
      normalizeMobile(mobile);

    const normalizedDeviceId =
      normalizeDeviceId(deviceId);

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !isValidIndianMobile(
        normalizedMobile,
      )
    ) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Enter a valid 10-digit Indian mobile number.",
      });
    }

    if (
      typeof password !==
        "string" ||
      !password.trim()
    ) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password is required.",
      });
    }

    if (!normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        field: "deviceId",
        message:
          "Device ID is required.",
      });
    }

    /* =====================================================
       FIND STAFF
    ===================================================== */

    const staff =
      await JanasevaStaff.findOne({
        mobile:
          normalizedMobile,
        role: "staff",
        isActive: true,
      }).select("+password");

    if (!staff) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid mobile number or password.",
      });
    }

    /* =====================================================
       PASSWORD CHECK
    ===================================================== */

    const passwordMatches =
      await bcrypt.compare(
        password,
        staff.password,
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid mobile number or password.",
      });
    }

    /* =====================================================
       SAME DEVICE LOGIN
    ===================================================== */

    const existingSession =
      staff.sessions.find(
        (session) =>
          session.deviceId ===
          normalizedDeviceId,
      );

    if (existingSession) {
      existingSession.lastActiveAt =
        new Date();

      staff.lastLoginAt =
        new Date();

      await staff.save();

      const token =
        createStaffToken(
          staff._id.toString(),
          existingSession.sessionId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Staff login successful.",

        token,

        user: {
          id: staff._id.toString(),
          name: staff.name,
          mobile: staff.mobile,
          designation:
            staff.designation,
          role: staff.role,
          isActive:
            staff.isActive,

          activeDevices:
            staff.sessions.length,

          maxDevices:
            MAX_STAFF_DEVICES,
        },
      });
    }

    /* =====================================================
       NEW DEVICE LIMIT
    ===================================================== */

    if (
      staff.sessions.length >=
      MAX_STAFF_DEVICES
    ) {
      return res.status(403).json({
        success: false,
        code:
          "STAFF_DEVICE_LIMIT_REACHED",

        message:
          "This Staff account is already active on 2 devices. Logout from one device before using another device.",

        activeDevices:
          staff.sessions.length,

        maxDevices:
          MAX_STAFF_DEVICES,
      });
    }

    /* =====================================================
       CREATE NEW SESSION
    ===================================================== */

    const sessionId =
      randomUUID();

    const now =
      new Date();

    /*
     * Atomic update prevents a third session
     * when two login requests happen together.
     */
    const updatedStaff =
      await JanasevaStaff.findOneAndUpdate(
        {
          _id: staff._id,
          role: "staff",
          isActive: true,

          "sessions.deviceId": {
            $ne:
              normalizedDeviceId,
          },

          $expr: {
            $lt: [
              {
                $size: {
                  $ifNull: [
                    "$sessions",
                    [],
                  ],
                },
              },
              MAX_STAFF_DEVICES,
            ],
          },
        },

        {
          $push: {
            sessions: {
              sessionId,
              deviceId:
                normalizedDeviceId,
              createdAt: now,
              lastActiveAt: now,
            },
          },

          $set: {
            lastLoginAt: now,
          },
        },

        {
          new: true,
        },
      );

    /* =====================================================
       LIMIT REACHED DURING REQUEST
    ===================================================== */

    if (!updatedStaff) {
      const latestStaff =
        await JanasevaStaff.findById(
          staff._id,
        );

      if (
        latestStaff &&
        latestStaff.sessions
          .length >=
          MAX_STAFF_DEVICES
      ) {
        return res.status(403).json({
          success: false,
          code:
            "STAFF_DEVICE_LIMIT_REACHED",

          message:
            "This Staff account is already active on 2 devices. Logout from one device before using another device.",

          activeDevices:
            latestStaff.sessions
              .length,

          maxDevices:
            MAX_STAFF_DEVICES,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Unable to create Staff session. Please try again.",
      });
    }

    /* =====================================================
       CREATE JWT
    ===================================================== */

    const token =
      createStaffToken(
        updatedStaff._id.toString(),
        sessionId,
      );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json({
      success: true,

      message:
        "Staff login successful.",

      token,

      user: {
        id:
          updatedStaff._id.toString(),

        name:
          updatedStaff.name,

        mobile:
          updatedStaff.mobile,

        designation:
          updatedStaff.designation,

        role:
          updatedStaff.role,

        isActive:
          updatedStaff.isActive,

        activeDevices:
          updatedStaff.sessions.length,

        maxDevices:
          MAX_STAFF_DEVICES,
      },
    });
  } catch (error) {
    console.error(
      "❌ STAFF LOGIN ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Staff login failed.",
    });
  }
}

/* =========================================================
   STAFF LOGOUT
   POST /api/staff/auth/logout

   Removes ONLY current device session.
========================================================= */

export async function staffLogout(
  req: PortalAuthenticatedRequest,
  res: Response,
) {
  try {
    const portalUser =
      req.portalUser;

    if (!portalUser) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized.",
      });
    }

    if (
      portalUser.role !==
      "staff"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Staff access required.",
      });
    }

    const result =
      await JanasevaStaff.updateOne(
        {
          _id:
            portalUser.userId,

          role: "staff",
        },

        {
          $pull: {
            sessions: {
              sessionId:
                portalUser.sessionId,
            },
          },
        },
      );

    if (
      result.matchedCount === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Staff account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Logged out from this device.",
    });
  } catch (error) {
    console.error(
      "❌ STAFF LOGOUT ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Staff logout failed.",
    });
  }
}

