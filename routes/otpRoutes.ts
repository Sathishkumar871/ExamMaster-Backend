
import express from "express";
import OTP from "../models/otpModel";
import Student from "../models/Student";
import { sendOtpEmail } from "../services/emailService";

const router = express.Router();

// ============================================================
// SEND OTP
// POST /api/otp/send-otp
// ============================================================

router.post(
  "/send-otp",
  async (req, res) => {
    try {
      // ========================================================
      // GET EMAIL
      // ========================================================

      const normalizedEmail =
        typeof req.body?.email === "string"
          ? req.body.email
              .trim()
              .toLowerCase()
          : "";

      // ========================================================
      // CHECK EMAIL
      // ========================================================

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
          code: "EMAIL_REQUIRED",
        });
      }

      // ========================================================
      // GMAIL VALIDATION
      // ========================================================

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

      // ========================================================
      // CHECK EXISTING STUDENT
      // ========================================================

      const existingStudent =
        await Student.findOne({
          email: normalizedEmail,
        }).lean();

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message:
            "An account already exists with this Gmail address. Please login with your Student ID.",
          code:
            "EMAIL_ALREADY_EXISTS",
        });
      }

      // ========================================================
      // GENERATE OTP
      // ========================================================

      const otp =
        Math.floor(
          100000 +
            Math.random() *
              900000
        ).toString();

      // ========================================================
      // OTP EXPIRY
      // ========================================================

      const expiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      // ========================================================
      // DELETE PREVIOUS OTP
      // ========================================================

      await OTP.deleteMany({
        email: normalizedEmail,
      });

      // ========================================================
      // CREATE NEW OTP
      // ========================================================

      const otpRecord =
        await OTP.create({
          email: normalizedEmail,
          otp,
          expiresAt,
          verified: false,
        });

      // ========================================================
      // LOG OTP REQUEST
      // ========================================================

      console.log(
        "=========================================="
      );

      console.log(
        "📧 OTP REQUEST"
      );

      console.log(
        "Email:",
        normalizedEmail
      );

      console.log(
        "OTP CREATED:",
        otpRecord._id.toString()
      );

      console.log(
        "=========================================="
      );

      // ========================================================
      // SEND EMAIL IN BACKGROUND
      // ========================================================
      // IMPORTANT:
      // Do NOT await this.
      //
      // The frontend will receive the HTTP response immediately.
      // Gmail SMTP can continue in the background.
      // ========================================================

      void sendOtpEmail(
        normalizedEmail,
        otp
      )
        .then(() => {
          console.log(
            "✅ Background OTP email completed"
          );

          console.log(
            "Email:",
            normalizedEmail
          );
        })
        .catch(
          async (emailError: any) => {
            // ==================================================
            // EMAIL FAILED
            // ==================================================

            console.error(
              "=========================================="
            );

            console.error(
              "❌ BACKGROUND OTP EMAIL FAILED"
            );

            console.error(
              "Email:",
              normalizedEmail
            );

            console.error(
              "Error Message:",
              emailError?.message ||
                "Unknown email error"
            );

            console.error(
              "Error Code:",
              emailError?.code ||
                "UNKNOWN"
            );

            console.error(
              "SMTP Response:",
              emailError?.response ||
                "NO RESPONSE"
            );

            console.error(
              "SMTP Command:",
              emailError?.command ||
                "NO COMMAND"
            );

            console.error(
              "=========================================="
            );

            // ==================================================
            // DELETE OTP WHEN EMAIL FAILS
            // ==================================================

            try {
              await OTP.deleteOne({
                _id: otpRecord._id,
              });

              console.log(
                "🗑️ Failed OTP deleted from database"
              );
            } catch (deleteError) {
              console.error(
                "❌ OTP DELETE ERROR:",
                deleteError
              );
            }
          }
        );

      // ========================================================
      // IMMEDIATE RESPONSE
      // ========================================================

      return res.status(200).json({
        success: true,

        message:
          "OTP sent successfully",
      });

    } catch (error: any) {
      // ========================================================
      // GENERAL ERROR
      // ========================================================

      console.error(
        "=========================================="
      );

      console.error(
        "❌ SEND OTP ROUTE ERROR"
      );

      console.error(
        "MESSAGE:",
        error?.message ||
          "Unknown error"
      );

      console.error(
        "CODE:",
        error?.code ||
          "UNKNOWN"
      );

      console.error(
        "=========================================="
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to send OTP. Please try again.",

        code:
          "SEND_OTP_ERROR",
      });
    }
  }
);

// ============================================================
// VERIFY OTP
// POST /api/otp/verify
// ============================================================

router.post(
  "/verify",
  async (req, res) => {
    try {
      const {
        email,
        otp,
      } = req.body;

      // ========================================================
      // CHECK INPUT
      // ========================================================

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required",

          code:
            "OTP_INPUT_REQUIRED",
        });
      }

      // ========================================================
      // NORMALIZE EMAIL
      // ========================================================

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      // ========================================================
      // NORMALIZE OTP
      // ========================================================

      const normalizedOtp =
        String(otp).trim();

      // ========================================================
      // GMAIL VALIDATION
      // ========================================================

      if (
        !normalizedEmail.endsWith(
          "@gmail.com"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid Gmail address",

          code:
            "INVALID_EMAIL",
        });
      }

      // ========================================================
      // OTP LENGTH
      // ========================================================

      if (
        normalizedOtp.length !== 6 ||
        !/^\d{6}$/.test(
          normalizedOtp
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP must be 6 digits",

          code:
            "INVALID_OTP_LENGTH",
        });
      }

      // ========================================================
      // CHECK EXISTING STUDENT
      // ========================================================

      const existingStudent =
        await Student.findOne({
          email:
            normalizedEmail,
        }).lean();

      if (existingStudent) {
        return res.status(409).json({
          success: false,

          message:
            "An account already exists with this Gmail address. Please login with your Student ID.",

          code:
            "EMAIL_ALREADY_EXISTS",
        });
      }

      // ========================================================
      // FIND LATEST OTP
      // ========================================================

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

      // ========================================================
      // OTP NOT FOUND
      // ========================================================

      if (!otpRecord) {
        return res.status(400).json({
          success: false,

          message:
            "OTP not found. Please request a new OTP.",

          code:
            "OTP_NOT_FOUND",
        });
      }

      // ========================================================
      // CHECK OTP EXPIRY
      // ========================================================

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

          code:
            "OTP_EXPIRED",
        });
      }

      // ========================================================
      // CHECK OTP VALUE
      // ========================================================

      if (
        otpRecord.otp !==
        normalizedOtp
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid OTP",

          code:
            "INVALID_OTP",
        });
      }

      // ========================================================
      // MARK VERIFIED
      // ========================================================

      otpRecord.verified =
        true;

      await otpRecord.save();

      // ========================================================
      // SUCCESS
      // ========================================================

      return res.status(200).json({
        success: true,

        message:
          "Email verified successfully",

        emailVerified:
          true,
      });

    } catch (error: any) {
      // ========================================================
      // VERIFY ERROR
      // ========================================================

      console.error(
        "VERIFY OTP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "OTP verification failed",

        code:
          "VERIFY_OTP_ERROR",
      });
    }
  }
);

export default router;

