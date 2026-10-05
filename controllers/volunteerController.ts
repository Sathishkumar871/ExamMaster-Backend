
import {
  Request,
  Response,
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";

import JanasevaVolunteer from "../models/JanasevaVolunteer";
import JanasevaUser from "../models/JanasevaUser";

/* =========================================================
   ENV
========================================================= */

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing from environment variables.",
  );
}

/* =========================================================
   VOLUNTEER REQUEST
========================================================= */

interface VolunteerRequest
  extends Request {
  volunteer?: {
    id: string;
    role: "volunteer";
    mobile?: string;
    sessionId?: string;
  };
}

/* =========================================================
   VOLUNTEER LOGIN
   POST /api/volunteers/login
========================================================= */

export const volunteerLogin =
  async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      /* =====================================================
         INPUT
      ===================================================== */

      const rawMobile =
        String(
          req.body?.mobile ?? "",
        );

      const password =
        String(
          req.body?.password ?? "",
        );

      const providedDeviceId =
        String(
          req.body?.deviceId ?? "",
        ).trim();

      /* =====================================================
         CLEAN MOBILE
      ===================================================== */

      const mobile =
        rawMobile
          .replace(/\D/g, "")
          .slice(0, 10);

      /* =====================================================
         VALIDATION
      ===================================================== */

      if (
        !/^[6-9][0-9]{9}$/.test(
          mobile,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit Indian mobile number.",
        });
      }

      if (!password.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter your password.",
        });
      }

      /* =====================================================
         FIND VOLUNTEER
         password has select:false
      ===================================================== */

      const volunteer =
        await JanasevaVolunteer.findOne(
          {
            mobile,
          },
        ).select(
          "+password",
        );

      if (!volunteer) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid mobile number or password.",
        });
      }

      /* =====================================================
         STATUS CHECK
      ===================================================== */

      if (
        volunteer.status ===
        "pending"
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_PENDING",

          message:
            "Your volunteer registration is still under review.",
        });
      }

      if (
        volunteer.status ===
        "rejected"
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_REJECTED",

          message:
            volunteer.rejectionReason
              ? `Your volunteer registration was rejected. Reason: ${volunteer.rejectionReason}`
              : "Your volunteer registration was rejected.",
        });
      }

      /* =====================================================
         ACTIVE CHECK
      ===================================================== */

      if (
        volunteer.isActive !==
        true
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_INACTIVE",

          message:
            "Your volunteer account is not active yet.",
        });
      }

      /* =====================================================
         PASSWORD CHECK
      ===================================================== */

      const passwordMatch =
        await bcrypt.compare(
          password,
          volunteer.password,
        );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid mobile number or password.",
        });
      }

      /* =====================================================
         DEVICE ID
      ===================================================== */

      const deviceId =
        providedDeviceId ||
        crypto.randomUUID();

      /* =====================================================
         SESSION ID
      ===================================================== */

      const sessionId =
        crypto.randomUUID();

      const now =
        new Date();

      /* =====================================================
         SAVE SESSION
      ===================================================== */

      volunteer.sessions =
        volunteer.sessions ||
        [];

      volunteer.sessions.push({
        sessionId,
        deviceId,
        createdAt: now,
        lastActiveAt: now,
      });

      /* =====================================================
         KEEP LAST 10 SESSIONS
      ===================================================== */

      if (
        volunteer.sessions.length >
        10
      ) {
        volunteer.sessions =
          volunteer.sessions.slice(
            -10,
          );
      }

      /* =====================================================
         LAST LOGIN
      ===================================================== */

      volunteer.lastLoginAt =
        now;

      await volunteer.save();

      /* =====================================================
         JWT
      ===================================================== */

      const token =
        jwt.sign(
          {
            volunteerId:
              volunteer._id.toString(),

            id: volunteer._id.toString(),

            role: "volunteer",

            mobile:
              volunteer.mobile,

            sessionId,
          },

          JWT_SECRET,

          {
            expiresIn: "7d",
          },
        );

      /* =====================================================
         USER RESPONSE
      ===================================================== */

      const user = {
        id:
          volunteer._id.toString(),

        _id:
          volunteer._id.toString(),

        name:
          volunteer.name,

        mobile:
          volunteer.mobile,

        state:
          volunteer.state,

        district:
          volunteer.district,

        mandal:
          volunteer.mandal,

        village:
          volunteer.village,

        role:
          volunteer.role,

        status:
          volunteer.status,

        isActive:
          volunteer.isActive,

        registrationSource:
          volunteer.registrationSource,

        registeredBy:
          volunteer.registeredBy
            ? volunteer.registeredBy.toString()
            : undefined,

        approvedBy:
          volunteer.approvedBy
            ? volunteer.approvedBy.toString()
            : undefined,

        approvedAt:
          volunteer.approvedAt,

        lastLoginAt:
          volunteer.lastLoginAt,

        createdAt:
          volunteer.createdAt,

        updatedAt:
          volunteer.updatedAt,
      };

      /* =====================================================
         SUCCESS
      ===================================================== */

      return res.status(200).json({
        success: true,

        message:
          "Volunteer login successful.",

        token,

        accessToken:
          token,

        sessionId,

        deviceId,

        user,

        data: {
          token,

          accessToken:
            token,

          sessionId,

          deviceId,

          user,
        },
      });
    } catch (error) {
      console.error(
        "[VOLUNTEER LOGIN ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to login. Please try again later.",
      });
    }
  };

/* =========================================================
   GET MY VILLAGE USERS
   GET /api/volunteers/village/users
========================================================= */

export const getMyVillageUsers =
  async (
    req: VolunteerRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      /* =====================================================
         VOLUNTEER ID
      ===================================================== */

      const volunteerId =
        req.volunteer?.id;

      if (!volunteerId) {
        return res.status(401).json({
          success: false,
          message:
            "Volunteer login required.",
        });
      }

      /* =====================================================
         VALIDATE ID
      ===================================================== */

      if (
        !mongoose.Types.ObjectId.isValid(
          volunteerId,
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid volunteer account.",
        });
      }

      /* =====================================================
         GET VOLUNTEER
      ===================================================== */

      const volunteer =
        await JanasevaVolunteer.findById(
          volunteerId,
        )
          .select(
            "name mobile state district mandal village role status isActive",
          )
          .lean();

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message:
            "Volunteer account not found.",
        });
      }

      /* =====================================================
         APPROVAL CHECK
      ===================================================== */

      if (
        volunteer.status !==
        "approved"
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_NOT_APPROVED",

          message:
            "Your volunteer account is not approved yet.",
        });
      }

      /* =====================================================
         ACTIVE CHECK
      ===================================================== */

      if (
        volunteer.isActive !==
        true
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_INACTIVE",

          message:
            "Your volunteer account is inactive.",
        });
      }

      /* =====================================================
         LOCATION CHECK
      ===================================================== */

      if (
        !volunteer.state ||
        !volunteer.district ||
        !volunteer.mandal ||
        !volunteer.village
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Volunteer location information is incomplete.",
        });
      }

      /* =====================================================
         FIND SAME VILLAGE USERS
         
         Exact location match:
         State
         District
         Mandal
         Village
      ===================================================== */

      const users =
        await JanasevaUser.find({
          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,

          isActive: true,
        })
          .select(
            "name mobile state district mandal village role notificationEnabled language createdAt",
          )
          .sort({
            name: 1,
          })
          .lean();

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        volunteer: {
          id:
            volunteer._id.toString(),

          name:
            volunteer.name,

          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,
        },

        location: {
          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,
        },

        count:
          users.length,

        users: users.map(
          (user) => ({
            id:
              user._id.toString(),

            name:
              user.name,

            mobile:
              user.mobile,

            state:
              user.state,

            district:
              user.district,

            mandal:
              user.mandal,

            village:
              user.village,

            role:
              user.role,

            notificationEnabled:
              user.notificationEnabled,

            language:
              user.language,

            createdAt:
              user.createdAt,
          }),
        ),
      });
    } catch (error) {
      console.error(
        "[GET MY VILLAGE USERS ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load village users.",
      });
    }
  };

