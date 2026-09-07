
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import Student from "../models/Student";
import Result from "../models/Result";
import OTP from "../models/otpModel";
import { sendOtpEmail } from "../services/emailService";

// ============================================================
// REGISTER STUDENT
// ============================================================

export const registerStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      studentId,
      email,
      mobileNumber,
      password,
      classId,
      className,
      academicYear,
      section,
    } = req.body;

    // ==========================================================
    // REQUIRED FIELDS
    // ==========================================================

    if (
      !name ||
      !studentId ||
      !email ||
      !mobileNumber ||
      !password ||
      !classId ||
      !className ||
      !academicYear ||
      !section
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    // ==========================================================
    // NORMALIZE VALUES
    // ==========================================================

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedStudentId = String(studentId)
      .trim()
      .toUpperCase();

    const normalizedMobile = String(mobileNumber)
      .replace(/\D/g, "")
      .trim();

    // ==========================================================
    // BASIC VALIDATION
    // ==========================================================

    if (
      !normalizedEmail.endsWith("@gmail.com")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please use a valid Gmail address",
        code: "INVALID_EMAIL",
      });
    }

    if (
      normalizedStudentId.length < 3
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Student ID",
        code: "INVALID_STUDENT_ID",
      });
    }

    if (
      normalizedMobile.length !== 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10-digit mobile number",
        code: "INVALID_MOBILE",
      });
    }

    // ==========================================================
    // DUPLICATE EMAIL CHECK
    // ==========================================================

    const existingEmail =
      await Student.findOne({
        email: normalizedEmail,
      }).lean();

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this Gmail address. Please login with your Student ID.",
        code: "EMAIL_ALREADY_EXISTS",
      });
    }

    // ==========================================================
    // DUPLICATE STUDENT ID CHECK
    // ==========================================================

    const existingStudentId =
      await Student.findOne({
        studentId:
          normalizedStudentId,
      }).lean();

    if (existingStudentId) {
      return res.status(409).json({
        success: false,
        message:
          "This Student ID is already registered.",
        code:
          "STUDENT_ID_ALREADY_EXISTS",
      });
    }

    // ==========================================================
    // DUPLICATE MOBILE CHECK
    // ==========================================================

    const existingMobile =
      await Student.findOne({
        mobileNumber:
          normalizedMobile,
      }).lean();

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message:
          "This mobile number is already registered.",
        code:
          "MOBILE_ALREADY_EXISTS",
      });
    }

    // ==========================================================
    // CHECK VERIFIED REGISTRATION OTP
    // ==========================================================

    const verifiedOtp =
      await OTP.findOne({
        email: normalizedEmail,
        verified: true,
      }).sort({
        createdAt: -1,
      });

    if (!verifiedOtp) {
      return res.status(400).json({
        success: false,
        message:
          "Please verify your email with OTP before registration.",
        code:
          "EMAIL_NOT_VERIFIED",
      });
    }

    // ==========================================================
    // CHECK OTP EXPIRY
    // ==========================================================

    if (
      verifiedOtp.expiresAt.getTime() <
      Date.now()
    ) {
      await OTP.deleteOne({
        _id: verifiedOtp._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "Email verification OTP expired. Please verify again.",
        code:
          "EMAIL_OTP_EXPIRED",
      });
    }

    // ==========================================================
    // HASH PASSWORD
    // ==========================================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // ==========================================================
    // CREATE STUDENT
    // ==========================================================

    const student =
      await Student.create({
        name:
          String(name).trim(),

        studentId:
          normalizedStudentId,

        email:
          normalizedEmail,

        emailVerified:
          true,

        mobileNumber:
          normalizedMobile,

        password:
          hashedPassword,

        classId:
          String(classId).trim(),

        className:
          String(className).trim(),

        academicYear:
          String(
            academicYear
          ).trim(),

        section:
          String(section).trim(),

        activeDeviceId:
          null,

        examsAttempted:
          0,

        totalMarks:
          0,

        rating:
          0,

        weeklyUpdates: {
          healthAndWellbeing:
            "",

          foodAndMaturation:
            "",

          hostel:
            "",

          academics:
            "",

          mentorActionPlan:
            "",
        },
      });

    // ==========================================================
    // DELETE USED REGISTRATION OTP
    // ==========================================================

    await OTP.deleteOne({
      _id: verifiedOtp._id,
    });

    // ==========================================================
    // SUCCESS
    // ==========================================================

    return res.status(201).json({
      success: true,

      message:
        "Registration successful",

      student: {
        name:
          student.name,

        studentId:
          student.studentId,

        email:
          student.email,

        emailVerified:
          student.emailVerified,

        mobileNumber:
          student.mobileNumber,

        classId:
          student.classId,

        className:
          student.className,

        academicYear:
          student.academicYear,

        section:
          student.section,
      },
    });
  } catch (error: any) {
    console.error(
      "REGISTER STUDENT ERROR:",
      error
    );

    // ==========================================================
    // MONGODB DUPLICATE KEY
    // ==========================================================

    if (error?.code === 11000) {
      const keyValue =
        error?.keyValue || {};

      const keyPattern =
        error?.keyPattern || {};

      // EMAIL
      if (
        keyValue.email ||
        keyPattern.email
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An account already exists with this Gmail address. Please login with your Student ID.",
          code:
            "EMAIL_ALREADY_EXISTS",
        });
      }

      // STUDENT ID
      if (
        keyValue.studentId ||
        keyPattern.studentId
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This Student ID is already registered.",
          code:
            "STUDENT_ID_ALREADY_EXISTS",
        });
      }

      // MOBILE
      if (
        keyValue.mobileNumber ||
        keyPattern.mobileNumber
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This mobile number is already registered.",
          code:
            "MOBILE_ALREADY_EXISTS",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "This student account already exists.",
        code:
          "DUPLICATE_ACCOUNT",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Registration failed",
    });
  }
};

// ============================================================
// LOGIN STUDENT
// STUDENT ID + PASSWORD
// ONLY ONE DEVICE ACTIVE
// ============================================================

export const loginStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      studentId,
      password,
    } = req.body;

    // ==========================================================
    // REQUIRED
    // ==========================================================

    if (
      !studentId ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID and Password required",
      });
    }

    // ==========================================================
    // NORMALIZE STUDENT ID
    // ==========================================================

    const normalizedStudentId =
      studentId
        .toString()
        .trim()
        .toUpperCase();

    // ==========================================================
    // FIND STUDENT
    // ==========================================================

    const student =
      await Student.findOne({
        studentId:
          normalizedStudentId,
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    // ==========================================================
    // EMAIL VERIFICATION
    // ==========================================================

    if (!student.emailVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before login",
      });
    }

    // ==========================================================
    // PASSWORD
    // ==========================================================

    const passwordMatch =
      await bcrypt.compare(
        password,
        student.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Wrong password",
      });
    }

    // ==========================================================
    // JWT SECRET
    // ==========================================================

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "JWT_SECRET is missing",
      });
    }

    // ==========================================================
    // NEW DEVICE SESSION
    // ==========================================================

    const deviceId =
      randomUUID();

    // ==========================================================
    // REPLACE OLD DEVICE
    // ==========================================================

    student.activeDeviceId =
      deviceId;

    await student.save();

    // ==========================================================
    // JWT
    // ==========================================================

    const token =
      jwt.sign(
        {
          id:
            student._id,

          studentId:
            student.studentId,

          name:
            student.name,

          email:
            student.email,

          mobileNumber:
            student.mobileNumber,

          classId:
            student.classId,

          className:
            student.className,

          academicYear:
            student.academicYear,

          section:
            student.section,

          deviceId,

          role:
            "student",
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            "7d",
        }
      );

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return res.json({
      success: true,

      message:
        "Login Success",

      token,

      student: {
        name:
          student.name,

        studentId:
          student.studentId,

        email:
          student.email,

        mobileNumber:
          student.mobileNumber,

        classId:
          student.classId,

        className:
          student.className,

        academicYear:
          student.academicYear,

        section:
          student.section,

        deviceId,
      },
    });
  } catch (error: any) {
    console.error(
      "LOGIN STUDENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Login failed",
    });
  }
};

// ============================================================
// FORGOT PASSWORD
// STUDENT ID → REGISTERED GMAIL OTP
// ============================================================

export const forgotStudentPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        studentId,
      } = req.body;

      // ========================================================
      // REQUIRED
      // ========================================================

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID is required",
        });
      }

      // ========================================================
      // NORMALIZE
      // ========================================================

      const normalizedStudentId =
        studentId
          .toString()
          .trim()
          .toUpperCase();

      // ========================================================
      // FIND STUDENT
      // ========================================================

      const student =
        await Student.findOne({
          studentId:
            normalizedStudentId,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
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
      // OTP EXPIRES IN 5 MINUTES
      // ========================================================

      const expiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      // ========================================================
      // DELETE OLD OTP
      // ========================================================

      await OTP.deleteMany({
        email:
          student.email,
      });

      // ========================================================
      // CREATE RESET OTP
      // ========================================================

      await OTP.create({
        email:
          student.email,

        otp,

        expiresAt,

        verified:
          false,
      });

      // ========================================================
      // SEND OTP
      // ========================================================

      await sendOtpEmail(
        student.email,
        otp
      );

      // ========================================================
      // FULL REGISTERED EMAIL
      // ========================================================

      return res.status(200).json({
        success: true,

        message:
          "OTP sent to your registered email",

        email:
          student.email,
      });
    } catch (error: any) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to send reset OTP",
      });
    }
  };

// ============================================================
// VERIFY RESET PASSWORD OTP
// ============================================================

export const verifyResetPasswordOtp =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        studentId,
        otp,
      } = req.body;

      // ========================================================
      // REQUIRED
      // ========================================================

      if (
        !studentId ||
        !otp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID and OTP are required",
        });
      }

      // ========================================================
      // NORMALIZE
      // ========================================================

      const normalizedStudentId =
        studentId
          .toString()
          .trim()
          .toUpperCase();

      const normalizedOtp =
        otp
          .toString()
          .trim();

      // ========================================================
      // FIND STUDENT
      // ========================================================

      const student =
        await Student.findOne({
          studentId:
            normalizedStudentId,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      // ========================================================
      // FIND LATEST UNVERIFIED OTP
      // ========================================================

      const otpRecord =
        await OTP.findOne({
          email:
            student.email,

          verified:
            false,
        }).sort({
          createdAt:
            -1,
        });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message:
            "OTP not found. Please request a new OTP.",
        });
      }

      // ========================================================
      // CHECK EXPIRY
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
        });
      }

      // ========================================================
      // OTP LENGTH
      // ========================================================

      if (
        normalizedOtp.length !== 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP must be 6 digits",
        });
      }

      // ========================================================
      // CHECK OTP
      // ========================================================

      if (
        otpRecord.otp !==
        normalizedOtp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP",
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
          "OTP verified successfully",

        otpVerified:
          true,
      });
    } catch (error: any) {
      console.error(
        "VERIFY RESET OTP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "OTP verification failed",
      });
    }
  };

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetStudentPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        studentId,
        newPassword,
      } = req.body;

      // ========================================================
      // REQUIRED
      // ========================================================

      if (
        !studentId ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID and new password are required",
        });
      }

      // ========================================================
      // PASSWORD LENGTH
      // ========================================================

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
      }

      // ========================================================
      // NORMALIZE STUDENT ID
      // ========================================================

      const normalizedStudentId =
        studentId
          .toString()
          .trim()
          .toUpperCase();

      // ========================================================
      // FIND STUDENT
      // ========================================================

      const student =
        await Student.findOne({
          studentId:
            normalizedStudentId,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      // ========================================================
      // FIND VERIFIED RESET OTP
      // ========================================================

      const verifiedOtp =
        await OTP.findOne({
          email:
            student.email,

          verified:
            true,
        }).sort({
          createdAt:
            -1,
        });

      if (!verifiedOtp) {
        return res.status(400).json({
          success: false,
          message:
            "Please verify OTP before resetting password",
        });
      }

      // ========================================================
      // CHECK OTP EXPIRY
      // ========================================================

      if (
        verifiedOtp.expiresAt.getTime() <
        Date.now()
      ) {
        await OTP.deleteOne({
          _id:
            verifiedOtp._id,
        });

        return res.status(400).json({
          success: false,
          message:
            "OTP expired. Please request a new OTP.",
        });
      }

      // ========================================================
      // HASH NEW PASSWORD
      // ========================================================

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      // ========================================================
      // UPDATE PASSWORD
      // ========================================================

      student.password =
        hashedPassword;

      await student.save();

      // ========================================================
      // DELETE USED OTP
      // ========================================================

      await OTP.deleteOne({
        _id:
          verifiedOtp._id,
      });

      // ========================================================
      // SUCCESS
      // ========================================================

      return res.status(200).json({
        success: true,

        message:
          "Password reset successfully",
      });
    } catch (error: any) {
      console.error(
        "RESET PASSWORD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Password reset failed",
      });
    }
  };

// ============================================================
// GET STUDENT PROFILE
// ============================================================

export const getStudentProfile = async (
  req: any,
  res: Response
) => {
  try {
    const {
      studentId,
    } = req.params;

    // ========================================================
    // NORMALIZE STUDENT ID
    // ========================================================

    const normalizedStudentId =
      studentId
        .toString()
        .trim()
        .toUpperCase();

    // ========================================================
    // FIND STUDENT
    // ========================================================

    const student =
      await Student.findOne({
        studentId:
          normalizedStudentId,
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    // ========================================================
    // FIND RESULTS
    // ========================================================

    const results =
      await Result.find({
        studentId:
          normalizedStudentId,
      }).sort({
        createdAt:
          -1,
      });

    // ========================================================
    // TOTAL EXAMS
    // ========================================================

    const totalExams =
      results.length;

    // ========================================================
    // TOTAL MARKS
    // ========================================================

    const totalMarks =
      results.reduce(
        (
          sum,
          item: any
        ) =>
          sum +
          (item.marks || 0),
        0
      );

    // ========================================================
    // AVERAGE
    // ========================================================

    const average =
      totalExams > 0
        ? Number(
            (
              results.reduce(
                (
                  sum,
                  item: any
                ) =>
                  sum +
                  (item.percentage || 0),
                0
              ) /
              totalExams
            ).toFixed(2)
          )
        : 0;

    // ========================================================
    // CORRECT ANSWERS
    // ========================================================

    const correctAnswers =
      results.reduce(
        (
          sum,
          item: any
        ) =>
          sum +
          (item.correctAnswers || 0),
        0
      );

    // ========================================================
    // WRONG ANSWERS
    // ========================================================

    const wrongAnswers =
      results.reduce(
        (
          sum,
          item: any
        ) =>
          sum +
          (item.wrongAnswers || 0),
        0
      );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,

      student: {
        name:
          student.name,

        email:
          student.email,

        mobileNumber:
          student.mobileNumber,

        studentId:
          student.studentId,

        emailVerified:
          student.emailVerified,

        classId:
          student.classId,

        className:
          student.className,

        academicYear:
          student.academicYear,

        section:
          student.section,
      },

      performance: {
        totalExams,

        totalMarks,

        average,

        correctAnswers,

        wrongAnswers,
      },

      results,
    });
  } catch (error: any) {
    console.error(
      "GET STUDENT PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get student profile",
    });
  }
};

