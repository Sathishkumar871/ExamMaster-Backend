import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import JanasevaPortalUser from "../models/JanasevaPortalUser";
import {
  PortalAuthenticatedRequest,
} from "../middleware/portalAuth";

const MAX_ADMIN_DEVICES = 4;

function normalizeAdminId(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeDeviceId(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createAdminToken(
  userId: string,
  sessionId: string,
) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId,
      role: "admin",
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
   ADMIN LOGIN
   Admin ID + Password + Device ID
========================================================= */

export async function adminLogin(
  req: Request,
  res: Response,
) {
  try {
    const { adminId, password, deviceId } = req.body;

    const normalizedAdminId =
      normalizeAdminId(adminId);

    const normalizedDeviceId =
      normalizeDeviceId(deviceId);

    if (!normalizedAdminId || !password) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and password are required",
      });
    }

    if (!normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required",
      });
    }

    const admin =
      await JanasevaPortalUser.findOne({
        adminId: normalizedAdminId,
        role: "admin",
        isActive: true,
      }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid Admin ID or password",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        admin.password,
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid Admin ID or password",
      });
    }

    /* -------------------------------------------------------
       SAME DEVICE
       Reuse existing session
    ------------------------------------------------------- */

    const existingSession =
      admin.sessions.find(
        (session) =>
          session.deviceId === normalizedDeviceId,
      );

    if (existingSession) {
      existingSession.lastActiveAt = new Date();

      admin.lastLoginAt = new Date();

      await admin.save();

      const token = createAdminToken(
        admin._id.toString(),
        existingSession.sessionId,
      );

      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token,
        user: {
          id: admin._id,
          name: admin.name,
          adminId: admin.adminId,
          email: admin.email,
          role: admin.role,
          activeDevices: admin.sessions.length,
          maxDevices: MAX_ADMIN_DEVICES,
        },
      });
    }

    /* -------------------------------------------------------
       NEW DEVICE
       Maximum 4 devices
    ------------------------------------------------------- */

    if (
      admin.sessions.length >=
      MAX_ADMIN_DEVICES
    ) {
      return res.status(403).json({
        success: false,
        code: "ADMIN_DEVICE_LIMIT_REACHED",
        message:
          "Admin account is already active on 4 devices. Logout from one device before logging in on another.",
        activeDevices: admin.sessions.length,
        maxDevices: MAX_ADMIN_DEVICES,
      });
    }

    const sessionId = randomUUID();
    const now = new Date();

    /*
     * Atomic-style guarded update.
     * This prevents adding a new session when the document
     * has already reached the 4-device limit.
     */
    const updatedAdmin =
      await JanasevaPortalUser.findOneAndUpdate(
        {
          _id: admin._id,
          role: "admin",
          isActive: true,
          "sessions.deviceId": {
            $ne: normalizedDeviceId,
          },
          $expr: {
            $lt: [
              {
                $size: {
                  $ifNull: ["$sessions", []],
                },
              },
              MAX_ADMIN_DEVICES,
            ],
          },
        },
        {
          $push: {
            sessions: {
              sessionId,
              deviceId: normalizedDeviceId,
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

    if (!updatedAdmin) {
      const latestAdmin =
        await JanasevaPortalUser.findById(
          admin._id,
        );

      if (
        latestAdmin &&
        latestAdmin.sessions.length >=
          MAX_ADMIN_DEVICES
      ) {
        return res.status(403).json({
          success: false,
          code: "ADMIN_DEVICE_LIMIT_REACHED",
          message:
            "Admin account is already active on 4 devices. Logout from one device before logging in on another.",
          activeDevices:
            latestAdmin.sessions.length,
          maxDevices: MAX_ADMIN_DEVICES,
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Unable to create admin session. Please try again.",
      });
    }

    const token = createAdminToken(
      updatedAdmin._id.toString(),
      sessionId,
    );

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        adminId: updatedAdmin.adminId,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        activeDevices:
          updatedAdmin.sessions.length,
        maxDevices: MAX_ADMIN_DEVICES,
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
}

/* =========================================================
   ADMIN LOGOUT
   Removes ONLY current device session
========================================================= */

export async function adminLogout(
  req: PortalAuthenticatedRequest,
  res: Response,
) {
  try {
    const portalUser = req.portalUser;

    if (!portalUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (portalUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const result =
      await JanasevaPortalUser.updateOne(
        {
          _id: portalUser.userId,
          role: "admin",
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

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out from this device",
    });
  } catch (error) {
    console.error(
      "Admin logout error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
}