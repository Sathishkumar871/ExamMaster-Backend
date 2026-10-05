
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { postgresPool } from "../config/postgres";
import JanasevaVolunteer from "../models/JanasevaVolunteer";

/* =========================================================
   CONSTANTS
========================================================= */

const FIXED_STATE = "Andhra Pradesh";

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeMobile(value: unknown): string {
  let mobile = String(value ?? "")
    .trim()
    .replace(/\D/g, "");

  if (mobile.length === 12 && mobile.startsWith("91")) {
    mobile = mobile.substring(2);
  }

  return mobile;
}

/* =========================================================
   NAME VALIDATION
========================================================= */

function isValidName(name: string): boolean {
  return /^[A-Za-z][A-Za-z .']{1,99}$/.test(name);
}

/* =========================================================
   MOBILE VALIDATION
========================================================= */

function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9][0-9]{9}$/.test(mobile);
}

/* =========================================================
   SUSPICIOUS / TEST MOBILE CHECK
========================================================= */

function isSuspiciousMobile(mobile: string): boolean {
  // 9999999999, 8888888888, etc.
  if (/^(\d)\1{9}$/.test(mobile)) {
    return true;
  }

  // 1212121212, 9090909090, etc.
  if (/^(\d{2})\1{4}$/.test(mobile)) {
    return true;
  }

  // 1234512345, 6789067890, etc.
  if (/^(\d{5})\1$/.test(mobile)) {
    return true;
  }

  // Obvious sequential numbers
  if (
    mobile === "1234567890" ||
    mobile === "0987654321"
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/* =========================================================
   REGISTER VOLUNTEER
   POST /api/volunteers/register
========================================================= */

export async function registerVolunteer(
  req: Request,
  res: Response,
) {
  try {
    /* =======================================================
       REQUEST DATA
    ======================================================= */

    const name = cleanText(req.body?.name);

    const mobile = normalizeMobile(
      req.body?.mobile,
    );

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    const district = cleanText(
      req.body?.district,
    );

    const mandal = cleanText(
      req.body?.mandal,
    );

    const village = cleanText(
      req.body?.village,
    );

    /* =======================================================
       STATE
       Never trust state from frontend.
    ======================================================= */

    const state = FIXED_STATE;

    /* =======================================================
       NAME
    ======================================================= */

    if (!name) {
      return res.status(400).json({
        success: false,
        field: "name",
        message: "Name is required.",
      });
    }

    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        field: "name",
        message:
          "Name must contain at least 2 characters.",
      });
    }

    if (!isValidName(name)) {
      return res.status(400).json({
        success: false,
        field: "name",
        message:
          "Please enter a valid name.",
      });
    }

    /* =======================================================
       MOBILE
    ======================================================= */

    if (!mobile) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Mobile number is required.",
      });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Mobile number must contain exactly 10 digits.",
      });
    }

    if (!isValidIndianMobile(mobile)) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Please enter a valid Indian mobile number.",
      });
    }

    if (isSuspiciousMobile(mobile)) {
      return res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Please enter a valid personal mobile number.",
      });
    }

    /* =======================================================
       PASSWORD
    ======================================================= */

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password is required.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must be at least 8 characters long.",
      });
    }

    /* =======================================================
       LOCATION REQUIRED
    ======================================================= */

    if (!district) {
      return res.status(400).json({
        success: false,
        field: "district",
        message:
          "Please select your district.",
      });
    }

    if (!mandal) {
      return res.status(400).json({
        success: false,
        field: "mandal",
        message:
          "Please select your mandal.",
      });
    }

    if (!village) {
      return res.status(400).json({
        success: false,
        field: "village",
        message:
          "Please select your village.",
      });
    }

    /* =======================================================
       DUPLICATE VOLUNTEER MOBILE CHECK
    ======================================================= */

    const existingVolunteer =
      await JanasevaVolunteer.findOne({
        mobile,
      }).lean();

    if (existingVolunteer) {
      return res.status(409).json({
        success: false,
        field: "mobile",
        message:
          "This mobile number is already registered as a volunteer.",
        status: existingVolunteer.status,
      });
    }

    /* =======================================================
       POSTGRESQL LOCATION VALIDATION
       District → Mandal → Village
    ======================================================= */

    const districtResult =
      await postgresPool.query(
        `
        SELECT
          d.id,
          d.name
        FROM districts d
        INNER JOIN states s
          ON s.id = d.state_id
        WHERE LOWER(s.name) = LOWER($1)
          AND LOWER(d.name) = LOWER($2)
        LIMIT 1;
        `,
        [
          state,
          district,
        ],
      );

    if (districtResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        field: "district",
        message:
          "Selected district is not valid.",
      });
    }

    const districtId = Number(
      districtResult.rows[0].id,
    );

    const mandalResult =
      await postgresPool.query(
        `
        SELECT
          m.id,
          m.name
        FROM mandals m
        INNER JOIN districts d
          ON d.id = m.district_id
        INNER JOIN states s
          ON s.id = d.state_id
        WHERE LOWER(s.name) = LOWER($1)
          AND d.id = $2
          AND LOWER(m.name) = LOWER($3)
        LIMIT 1;
        `,
        [
          state,
          districtId,
          mandal,
        ],
      );

    if (mandalResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        field: "mandal",
        message:
          "Selected mandal does not belong to the selected district.",
      });
    }

    const mandalId = Number(
      mandalResult.rows[0].id,
    );

    const villageResult =
      await postgresPool.query(
        `
        SELECT
          v.id,
          v.name
        FROM villages v
        INNER JOIN mandals m
          ON m.id = v.mandal_id
        INNER JOIN districts d
          ON d.id = m.district_id
        INNER JOIN states s
          ON s.id = d.state_id
        WHERE LOWER(s.name) = LOWER($1)
          AND d.id = $2
          AND m.id = $3
          AND LOWER(v.name) = LOWER($4)
        LIMIT 1;
        `,
        [
          state,
          districtId,
          mandalId,
          village,
        ],
      );

    if (villageResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        field: "village",
        message:
          "Selected village does not belong to the selected mandal.",
      });
    }

    /* =======================================================
       PASSWORD HASH
       Never store plain password.
    ======================================================= */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12,
      );

    /* =======================================================
       CREATE PENDING VOLUNTEER
    ======================================================= */

    const volunteer =
      await JanasevaVolunteer.create({
        name,

        mobile,

        password: hashedPassword,

        state: FIXED_STATE,

        district:
          districtResult.rows[0].name,

        mandal:
          mandalResult.rows[0].name,

        village:
          villageResult.rows[0].name,

        role: "volunteer",

        status: "pending",

        isActive: false,

        registrationSource:
          "volunteer_portal",

        sessions: [],
      });

    /* =======================================================
       SUCCESS
    ======================================================= */

    return res.status(201).json({
      success: true,

      message:
        "Volunteer registration submitted successfully. Your application is pending staff approval.",

      volunteer: {
        id: volunteer._id.toString(),

        name: volunteer.name,

        mobile: volunteer.mobile,

        state: volunteer.state,

        district:
          volunteer.district,

        mandal:
          volunteer.mandal,

        village:
          volunteer.village,

        role: volunteer.role,

        status: volunteer.status,

        isActive:
          volunteer.isActive,

        createdAt:
          volunteer.createdAt,
      },
    });
  } catch (error: any) {
    console.error(
      "❌ VOLUNTEER REGISTRATION ERROR:",
      error,
    );

    /* =======================================================
       MONGODB DUPLICATE KEY
    ======================================================= */

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        field: "mobile",
        message:
          "This mobile number is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to complete volunteer registration.",
    });
  }
}

