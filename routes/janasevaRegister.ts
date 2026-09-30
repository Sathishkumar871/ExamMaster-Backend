import {
  Router,
  Request,
  Response,
} from "express";

import JanasevaUser from "../models/JanasevaUser";

const router = Router();

const FIXED_STATE =
  "Andhra Pradesh";

// ============================================================================
// HELPERS
// ============================================================================

function cleanText(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeMobile(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/^\+91/, "")
    .replace(/^91/, "")
    .trim();
}

// ============================================================================
// NAME VALIDATION
// ============================================================================

function isValidName(
  name: string,
): boolean {
  return /^[A-Za-z][A-Za-z .']{1,99}$/.test(
    name,
  );
}

// ============================================================================
// MOBILE VALIDATION
// ============================================================================

function isValidIndianMobile(
  mobile: string,
): boolean {
  return /^[6-9][0-9]{9}$/.test(
    mobile,
  );
}

// Obvious dummy/test patterns.
// This does NOT determine real ownership.
function isSuspiciousMobile(
  mobile: string,
): boolean {
  // 9999999999
  // 8888888888
  // 7777777777
  if (/^(\d)\1{9}$/.test(mobile)) {
    return true;
  }

  // 1212121212
  // 9090909090
  if (/^(\d{2})\1{4}$/.test(mobile)) {
    return true;
  }

  // 1234512345
  if (/^(\d{5})\1$/.test(mobile)) {
    return true;
  }

  // Obvious sequences
  if (
    mobile === "1234567890" ||
    mobile === "0987654321"
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// REGISTER
// ============================================================================

router.post(
  "/register",
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      // ================================================================
      // REQUEST DATA
      // ================================================================

      const name = cleanText(
        req.body?.name,
      );

      const mobile =
        normalizeMobile(
          req.body?.mobile,
        );

      const district =
        cleanText(
          req.body?.district,
        );

      const mandal =
        cleanText(
          req.body?.mandal,
        );

      const village =
        cleanText(
          req.body?.village,
        );

      // State is NEVER accepted from the app.
      const state =
        FIXED_STATE;

      // ================================================================
      // NAME
      // ================================================================

      if (!name) {
        return res.status(400).json({
          success: false,
          field: "name",
          message:
            "Name is required.",
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

      // ================================================================
      // MOBILE - EXACTLY 10 DIGITS
      // ================================================================

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

      // ================================================================
      // INDIAN MOBILE
      // ================================================================

      if (!isValidIndianMobile(mobile)) {
        return res.status(400).json({
          success: false,
          field: "mobile",
          message:
            "Please enter a valid Indian mobile number.",
        });
      }

      // ================================================================
      // DUMMY / TEST NUMBERS
      // ================================================================

      if (isSuspiciousMobile(mobile)) {
        return res.status(400).json({
          success: false,
          field: "mobile",
          message:
            "Please enter a valid personal mobile number.",
        });
      }

      // ================================================================
      // DUPLICATE MOBILE CHECK
      // ================================================================

      const existingUser =
        await JanasevaUser.findOne({
          mobile,
        }).lean();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          field: "mobile",
          message:
            "This mobile number is already registered.",
        });
      }

      // ================================================================
      // DISTRICT
      // ================================================================

      if (!district) {
        return res.status(400).json({
          success: false,
          field: "district",
          message:
            "Please select your district.",
        });
      }

      // ================================================================
      // MANDAL
      // ================================================================

      if (!mandal) {
        return res.status(400).json({
          success: false,
          field: "mandal",
          message:
            "Please select your mandal.",
        });
      }

      // ================================================================
      // VILLAGE
      // ================================================================

      if (!village) {
        return res.status(400).json({
          success: false,
          field: "village",
          message:
            "Please select your village.",
        });
      }

      // ================================================================
      // CREATE USER
      // ================================================================

      const user =
        await JanasevaUser.create({
          name,
          mobile,
          state,
          district,
          mandal,
          village,
          role: "user",
          isActive: true,
        });

      // ================================================================
      // SUCCESS RESPONSE
      // ================================================================

      return res.status(201).json({
        success: true,
        message:
          "Registration successful.",

        user: {
          id: user._id.toString(),
          name: user.name,
          mobile: user.mobile,
          state: user.state,
          district: user.district,
          mandal: user.mandal,
          village: user.village,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error(
        "❌ JANASEVA REGISTER ERROR:",
        error,
      );

      // MongoDB duplicate key protection.
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
          "Unable to complete registration.",
      });
    }
  },
);

// ============================================================================
// GET USERS - DEVELOPMENT TEST ONLY
// ============================================================================

router.get(
  "/users",
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const users =
        await JanasevaUser.find({})
          .sort({
            createdAt: -1,
          })
          .limit(100)
          .lean();

      return res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error(
        "❌ JANASEVA USERS ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch users.",
      });
    }
  },
);

export default router;