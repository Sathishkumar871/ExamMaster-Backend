
import express from "express";
import OTP from "../models/otpModel";
import Student from "../models/Student";
import { sendOtpEmail } from "../services/emailService";

const router = express.Router();

// ==========================================
// SEND OTP
// POST /api/otp/send-otp
// ==========================================
router.post(
  "/send-otp",
  async (req, res) => {
    try {
      const { email } = req.body;

      // ==========================================
      // CHECK EMAIL
      // ==========================================

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
          code: "EMAIL_REQUIRED",
        });
      }

      // ==========================================
      // NORMALIZE EMAIL
      // ==========================================

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      // ==========================================
      // GMAIL VALIDATION
      // ==========================================

      if (
        !normalizedEmail.endsWith("@gmail.com")
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid Gmail address",
          code: "INVALID_EMAIL",
        });
      }

      // ==========================================
      // CHECK EXISTING STUDENT ACCOUNT
      // IMPORTANT
      // ==========================================

      const existingStudent =
        await Student.findOne({
          email: normalizedEmail,
        }).lean();

      // ==========================================
      // ACCOUNT ALREADY EXISTS
      // ==========================================

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message:
            "An account already exists with this Gmail address. Please login with your Student ID.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }

      // ==========================================
      // GENERATE 6 DIGIT OTP
      // ==========================================

      const otp =
        Math.floor(
          100000 +
            Math.random() * 900000
        ).toString();

      // ==========================================
      // OTP VALID FOR 5 MINUTES
      // ==========================================

      const expiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      // ==========================================
      // DELETE PREVIOUS OTPS
      // ==========================================

      await OTP.deleteMany({
        email:
          normalizedEmail,
      });

      // ==========================================
      // SAVE NEW OTP
      // ==========================================

      await OTP.create({
        email:
          normalizedEmail,

        otp,

        expiresAt,

        verified: false,
      });

      // ==========================================
      // SEND OTP
      // ==========================================

      await sendOtpEmail(
        normalizedEmail,
        otp
      );

      // ==========================================
      // SUCCESS
      // ==========================================

      return res.status(200).json({
        success: true,

        message:
          "OTP sent successfully",
      });
    } catch (error: any) {
      console.error(
        "SEND OTP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to send OTP",
      });
    }
  }
);

// ==========================================
// VERIFY OTP
// POST /api/otp/verify
// ==========================================
router.post(
  "/verify",
  async (req, res) => {
    try {
      const {
        email,
        otp,
      } = req.body;

      // ==========================================
      // CHECK INPUT
      // ==========================================

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required",
          code: "OTP_INPUT_REQUIRED",
        });
      }

      // ==========================================
      // NORMALIZE VALUES
      // ==========================================

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const normalizedOtp =
        String(otp)
          .trim();

      // ==========================================
      // GMAIL VALIDATION
      // ==========================================

      if (
        !normalizedEmail.endsWith("@gmail.com")
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid Gmail address",
          code: "INVALID_EMAIL",
        });
      }

      // ==========================================
      // CHECK IF ACCOUNT WAS CREATED
      // AFTER OTP WAS SENT
      // ==========================================

      const existingStudent =
        await Student.findOne({
          email: normalizedEmail,
        }).lean();

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message:
            "An account already exists with this Gmail address. Please login with your Student ID.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }

      // ==========================================
      // FIND LATEST UNVERIFIED OTP
      // ==========================================

      const otpRecord =
        await OTP.findOne({
          email:
            normalizedEmail,

          verified:
            false,
        }).sort({
          createdAt:
            -1,
        });

      // ==========================================
      // OTP NOT FOUND
      // ==========================================

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message:
            "OTP not found. Please request a new OTP.",
          code: "OTP_NOT_FOUND",
        });
      }

      // ==========================================
      // CHECK EXPIRY
      // ==========================================

      if (
        otpRecord.expiresAt.getTime() <
        Date.now()
      ) {
        await OTP.deleteOne({
          _id:
            otpRecord._id,
        });

        return res.status(400).json({
          success: false,
          message:
            "OTP expired. Please request a new OTP.",
          code: "OTP_EXPIRED",
        });
      }

      // ==========================================
      // OTP LENGTH
      // ==========================================

      if (
        normalizedOtp.length !== 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP must be 6 digits",
          code: "INVALID_OTP_LENGTH",
        });
      }

      // ==========================================
      // CHECK OTP
      // ==========================================

      if (
        otpRecord.otp !==
        normalizedOtp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP",
          code: "INVALID_OTP",
        });
      }

      // ==========================================
      // MARK VERIFIED
      // ==========================================

      otpRecord.verified =
        true;

      await otpRecord.save();

      // ==========================================
      // SUCCESS
      // ==========================================

      return res.status(200).json({
        success: true,

        message:
          "Email verified successfully",

        emailVerified:
          true,
      });
    } catch (error: any) {
      console.error(
        "VERIFY OTP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "OTP verification failed",
      });
    }
  }
);

export default router;

