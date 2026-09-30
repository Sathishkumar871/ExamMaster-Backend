
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import JanasevaUser from "../models/JanasevaUser";

// ============================================================================
// MOBILE NORMALIZATION
// ============================================================================

function normalizeMobile(value: unknown): string {
  let mobile = String(value ?? "").trim();

  // Keep digits only
  mobile = mobile.replace(/\D/g, "");

  // Convert 91XXXXXXXXXX -> XXXXXXXXXX
  if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.substring(2);
  }

  return mobile;
}

// ============================================================================
// MOBILE VALIDATION
// ============================================================================

function isValidMobile(
  mobile: string,
): boolean {
  // Indian 10-digit mobile
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return false;
  }

  // Same digit repeated
  // Example: 9999999999
  if (/^(\d)\1{9}$/.test(mobile)) {
    return false;
  }

  // Same 2-digit block repeated
  // Example: 1212121212
  if (/^(\d{2})\1{4}$/.test(mobile)) {
    return false;
  }

  // Same 5-digit block repeated
  // Example: 1234512345
  if (/^(\d{5})\1$/.test(mobile)) {
    return false;
  }

  // Obvious sequential test numbers
  if (
    mobile === "1234567890" ||
    mobile === "0987654321"
  ) {
    return false;
  }

  return true;
}

// ============================================================================
// LOGIN CONTROLLER
// ============================================================================

export const loginJanasevaUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // ========================================================================
    // 1. GET MOBILE
    // ========================================================================

    const mobile = normalizeMobile(
      req.body?.mobile,
    );

    // deviceId is currently received for future
    // device/session management.
    const deviceId =
      String(
        req.body?.deviceId ?? "",
      ).trim();

    // Do not use deviceId for authentication yet.
    // We will add session/device security later.

    if (deviceId) {
      console.log(
        `📱 Janaseva login request from device: ${deviceId.substring(
          0,
          10,
        )}...`,
      );
    }

    // ========================================================================
    // 2. MOBILE REQUIRED
    // ========================================================================

    if (!mobile) {
      res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Mobile number is required.",
      });

      return;
    }

    // ========================================================================
    // 3. MOBILE VALIDATION
    // ========================================================================

    if (!isValidMobile(mobile)) {
      res.status(400).json({
        success: false,
        field: "mobile",
        message:
          "Enter a valid 10-digit mobile number.",
      });

      return;
    }

    // ========================================================================
    // 4. FIND USER
    // ========================================================================

    const user =
      await JanasevaUser.findOne({
        mobile,
      }).lean();

    // ========================================================================
    // 5. USER NOT FOUND
    // ========================================================================

    if (!user) {
      res.status(404).json({
        success: false,
        field: "mobile",
        message:
          "This mobile number is not registered.",
      });

      return;
    }

    // ========================================================================
    // 6. ACCOUNT STATUS
    // ========================================================================

    if (user.isActive !== true) {
      res.status(403).json({
        success: false,
        field: "account",
        message:
          "Your account is currently inactive. Please contact support.",
      });

      return;
    }

    // ========================================================================
    // 7. JWT SECRET
    // ========================================================================

    const jwtSecret =
      process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "❌ JWT_SECRET is missing in environment variables.",
      );

      res.status(500).json({
        success: false,
        message:
          "Authentication configuration is missing.",
      });

      return;
    }

    // ========================================================================
    // 8. CREATE JWT
    // ========================================================================

    const token = jwt.sign(
      {
        userId: String(user._id),
        mobile: user.mobile,
        role: user.role || "user",
        type: "janaseva",
      },
      jwtSecret,
      {
        expiresIn: "30d",
      },
    );

    // ========================================================================
    // 9. SUCCESS RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      message:
        "Login successful.",

      token,

      user: {
        id: String(user._id),
        name: user.name,
        mobile: user.mobile,
        state: user.state,
        district: user.district,
        mandal: user.mandal,
        village: user.village,
        role: user.role || "user",
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error(
      "❌ Janaseva login error:",
      error,
    );

    // ========================================================================
    // DEVELOPMENT ERROR
    // ========================================================================

    const isDevelopment =
      process.env.NODE_ENV ===
      "development";

    res.status(500).json({
      success: false,
      message:
        "Something went wrong during login.",
      ...(isDevelopment && {
        error:
          error?.message ||
          "Unknown error",
      }),
    });
  }
};

