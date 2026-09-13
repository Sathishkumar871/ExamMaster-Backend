import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student";

// ============================================================
// TEMPORARY PASSWORD RESET OTP STORE
// ============================================================

interface ResetOtpData {
  otp: string;
  expiresAt: number;
  verified: boolean;
}

const resetOtpStore = new Map<string, ResetOtpData>();

// ============================================================
// GENERATE OTP
// ============================================================

const generateOtp = (): string => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

// ============================================================
// STUDENT REGISTER
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
        message:
          "All required fields including Student ID must be provided",
      });
    }

    const normalizedStudentId = String(studentId)
      .trim()
      .toUpperCase();

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedMobile =
      String(mobileNumber).trim();

    // ========================================================
    // CHECK STUDENT ID
    // ========================================================

    const existingStudentId =
      await Student.findOne({
        studentId: normalizedStudentId,
      });

    if (existingStudentId) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID already registered. Please check your ID card.",
      });
    }

    // ========================================================
    // CHECK EMAIL
    // ========================================================

    const existingEmail =
      await Student.findOne({
        email: normalizedEmail,
      });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // ========================================================
    // CHECK MOBILE
    // ========================================================

    const existingMobile =
      await Student.findOne({
        mobileNumber: normalizedMobile,
      });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    // ========================================================
    // HASH PASSWORD
    // ========================================================

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        10
      );

    // ========================================================
    // CREATE STUDENT
    // ========================================================

    const student =
      await Student.create({
        name: String(name).trim(),
        studentId: normalizedStudentId,
        email: normalizedEmail,
        mobileNumber: normalizedMobile,
        password: hashedPassword,
        classId: String(classId).trim(),
        className: String(className).trim(),
        academicYear:
          String(academicYear).trim(),
        section: String(section).trim(),

        // First login can happen from any device
        activeDeviceId: null,

        examsAttempted: 0,
        totalMarks: 0,
        rating: 0,

        weeklyUpdates: {
          healthAndWellbeing: "",
          foodAndMaturation: "",
          hostel: "",
          academics: "",
          mentorActionPlan: "",
        },
      });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",

      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        mobileNumber: student.mobileNumber,
        classId: student.classId,
        className: student.className,
        academicYear: student.academicYear,
        section: student.section,
      },
    });
  } catch (error: any) {
    console.error(
      "STUDENT REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Student registration failed",
      error: error.message,
    });
  }
};

// ============================================================
// STUDENT LOGIN
// Supports Student ID or Email + Single Device Security
// ============================================================

export const loginStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      studentId,
      email,
      password,
      deviceId,
    } = req.body;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (
      (!studentId && !email) ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID or Email and password are required",
      });
    }

    // ========================================================
    // FIND STUDENT
    // ========================================================

    let student = null;

    if (studentId) {
      const normalizedStudentId =
        String(studentId)
          .trim()
          .toUpperCase();

      student =
        await Student.findOne({
          studentId:
            normalizedStudentId,
        });
    } else if (email) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      student =
        await Student.findOne({
          email: normalizedEmail,
        });
    }

    if (!student) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid credentials or student not found",
      });
    }

    // ========================================================
    // PASSWORD CHECK
    // Supports hashed + old plain-text passwords
    // ========================================================

    let passwordMatch = false;

    if (
      student.password.startsWith("$2a$") ||
      student.password.startsWith("$2b$") ||
      student.password.startsWith("$2y$")
    ) {
      passwordMatch =
        await bcrypt.compare(
          String(password),
          student.password
        );
    } else {
      passwordMatch =
        String(password).trim() ===
        student.password;
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid credentials or password",
      });
    }

    // ========================================================
    // SINGLE DEVICE SECURITY
    // ========================================================

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message:
          "Device ID is required for student login",
      });
    }

    const currentDeviceId =
      String(deviceId).trim();

    if (!currentDeviceId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid device ID",
      });
    }

    // ========================================================
    // BLOCK OTHER DEVICE
    // ========================================================

    if (
      student.activeDeviceId &&
      String(student.activeDeviceId) !==
        currentDeviceId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This account is already active on another device. Please logout from the other device first.",
      });
    }

    // ========================================================
    // FIRST LOGIN -> SAVE DEVICE
    // SAME DEVICE -> CONTINUE
    // ========================================================

    if (!student.activeDeviceId) {
      student.activeDeviceId =
        currentDeviceId;

      await student.save();
    }

    // ========================================================
    // CREATE JWT TOKEN
    // IMPORTANT: deviceId is included in JWT
    // ========================================================

    const token = jwt.sign(
      {
        id: student._id,
        studentId: student.studentId,
        role: "student",

        // IMPORTANT FIX
        deviceId: currentDeviceId,
      },
      process.env.JWT_SECRET ||
        "your_jwt_secret_key",
      {
        expiresIn: "7d",
      }
    );

    // ========================================================
    // LOGIN RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        mobileNumber:
          student.mobileNumber,

        classId: student.classId,
        className:
          student.className,
        academicYear:
          student.academicYear,
        section:
          student.section,

        activeDeviceId:
          student.activeDeviceId,

        examsAttempted:
          student.examsAttempted,

        totalMarks:
          student.totalMarks,

        rating:
          student.rating,

        weeklyUpdates:
          student.weeklyUpdates,
      },
    });
  } catch (error: any) {
    console.error(
      "STUDENT LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Student login failed",
      error: error.message,
    });
  }
};

// ============================================================
// GET STUDENT PROFILE
// ============================================================

export const getStudentProfile = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID is required",
      });
    }

    const student =
      await Student.findOne({
        studentId:
          String(studentId)
            .trim()
            .toUpperCase(),
      }).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error: any) {
    console.error(
      "GET STUDENT PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get student profile",
      error: error.message,
    });
  }
};

// ============================================================
// FORGOT STUDENT PASSWORD
// ============================================================

export const forgotStudentPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const student =
        await Student.findOne({
          email: normalizedEmail,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "No student found with this email",
        });
      }

      const otp =
        generateOtp();

      resetOtpStore.set(
        normalizedEmail,
        {
          otp,
          expiresAt:
            Date.now() +
            10 * 60 * 1000,
          verified: false,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset OTP generated successfully",
        otp,
      });
    } catch (error: any) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to process forgot password",
        error: error.message,
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
      const { email, otp } =
        req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required",
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const resetData =
        resetOtpStore.get(
          normalizedEmail
        );

      if (!resetData) {
        return res.status(400).json({
          success: false,
          message:
            "OTP not found. Please request a new OTP",
        });
      }

      if (
        Date.now() >
        resetData.expiresAt
      ) {
        resetOtpStore.delete(
          normalizedEmail
        );

        return res.status(400).json({
          success: false,
          message: "OTP has expired",
        });
      }

      if (
        String(otp).trim() !==
        resetData.otp
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      resetData.verified =
        true;

      resetOtpStore.set(
        normalizedEmail,
        resetData
      );

      return res.status(200).json({
        success: true,
        message:
          "OTP verified successfully",
      });
    } catch (error: any) {
      console.error(
        "VERIFY RESET OTP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to verify reset OTP",
        error: error.message,
      });
    }
  };

// ============================================================
// RESET STUDENT PASSWORD
// ============================================================

export const resetStudentPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        email,
        newPassword,
      } = req.body;

      if (
        !email ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email and new password are required",
        });
      }

      if (
        String(newPassword).length <
        6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const resetData =
        resetOtpStore.get(
          normalizedEmail
        );

      if (
        !resetData ||
        !resetData.verified
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please request and verify OTP first",
        });
      }

      const student =
        await Student.findOne({
          email: normalizedEmail,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          String(newPassword),
          10
        );

      student.password =
        hashedPassword;

      // Release old device lock
      student.activeDeviceId =
        null;

      await student.save();

      resetOtpStore.delete(
        normalizedEmail
      );

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
          "Failed to reset password",
        error: error.message,
      });
    }
  };

// ============================================================
// GET STUDENT BY ID
// ============================================================

export const getStudentById = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId } =
      req.params;

    const normalizedStudentId =
      String(studentId)
        .trim()
        .toUpperCase();

    const student =
      await Student.findOne({
        studentId:
          normalizedStudentId,
      }).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error: any) {
    console.error(
      "GET STUDENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get student",
      error: error.message,
    });
  }
};

// ============================================================
// GET ALL STUDENTS
// ============================================================

export const getAllStudents =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const students =
        await Student.find()
          .select("-password")
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        count: students.length,
        students,
      });
    } catch (error: any) {
      console.error(
        "GET ALL STUDENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get students",
        error: error.message,
      });
    }
  };

// ============================================================
// UPDATE STUDENT
// ============================================================

export const updateStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId } =
      req.params;

    const {
      name,
      email,
      mobileNumber,
      classId,
      className,
      academicYear,
      section,
    } = req.body;

    const normalizedStudentId =
      String(studentId)
        .trim()
        .toUpperCase();

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

    if (name !== undefined) {
      student.name =
        String(name).trim();
    }

    if (email !== undefined) {
      student.email =
        String(email)
          .trim()
          .toLowerCase();
    }

    if (
      mobileNumber !== undefined
    ) {
      student.mobileNumber =
        String(
          mobileNumber
        ).trim();
    }

    if (classId !== undefined) {
      student.classId =
        String(classId).trim();
    }

    if (className !== undefined) {
      student.className =
        String(className).trim();
    }

    if (
      academicYear !==
      undefined
    ) {
      student.academicYear =
        String(
          academicYear
        ).trim();
    }

    if (section !== undefined) {
      student.section =
        String(section).trim();
    }

    await student.save();

    return res.status(200).json({
      success: true,
      message:
        "Student updated successfully",

      student: {
        id: student._id,
        studentId:
          student.studentId,
        name: student.name,
        email: student.email,
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
      "UPDATE STUDENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update student",
      error: error.message,
    });
  }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changeStudentPassword =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { studentId } =
        req.params;

      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password and new password are required",
        });
      }

      if (
        String(newPassword).length <
        6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be at least 6 characters",
        });
      }

      const normalizedStudentId =
        String(studentId)
          .trim()
          .toUpperCase();

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

      let passwordMatch =
        false;

      if (
        student.password.startsWith(
          "$2a$"
        ) ||
        student.password.startsWith(
          "$2b$"
        ) ||
        student.password.startsWith(
          "$2y$"
        )
      ) {
        passwordMatch =
          await bcrypt.compare(
            String(currentPassword),
            student.password
          );
      } else {
        passwordMatch =
          String(
            currentPassword
          ).trim() ===
          student.password;
      }

      if (!passwordMatch) {
        return res.status(400).json({
          success: false,
          message:
            "Current password is incorrect",
        });
      }

      student.password =
        await bcrypt.hash(
          String(newPassword),
          10
        );

      await student.save();

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully",
      });
    } catch (error: any) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to change password",
        error: error.message,
      });
    }
  };

// ============================================================
// UPDATE WEEKLY UPDATES
// ============================================================

export const updateWeeklyUpdates =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { studentId } =
        req.params;

      const {
        healthAndWellbeing,
        foodAndMaturation,
        hostel,
        academics,
        mentorActionPlan,
      } = req.body;

      const normalizedStudentId =
        String(studentId)
          .trim()
          .toUpperCase();

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

      if (
        healthAndWellbeing !==
        undefined
      ) {
        student.weeklyUpdates.healthAndWellbeing =
          String(
            healthAndWellbeing
          );
      }

      if (
        foodAndMaturation !==
        undefined
      ) {
        student.weeklyUpdates.foodAndMaturation =
          String(
            foodAndMaturation
          );
      }

      if (hostel !== undefined) {
        student.weeklyUpdates.hostel =
          String(hostel);
      }

      if (
        academics !==
        undefined
      ) {
        student.weeklyUpdates.academics =
          String(academics);
      }

      if (
        mentorActionPlan !==
        undefined
      ) {
        student.weeklyUpdates.mentorActionPlan =
          String(
            mentorActionPlan
          );
      }

      student.weeklyUpdates.updatedAt =
        new Date();

      await student.save();

      return res.status(200).json({
        success: true,
        message:
          "Weekly updates saved successfully",
        weeklyUpdates:
          student.weeklyUpdates,
      });
    } catch (error: any) {
      console.error(
        "WEEKLY UPDATE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update weekly updates",
        error: error.message,
      });
    }
  };

// ============================================================
// UPDATE EXAM PERFORMANCE
// ============================================================

export const updateExamPerformance =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { studentId } =
        req.params;

      const {
        examsAttempted,
        totalMarks,
        rating,
      } = req.body;

      const normalizedStudentId =
        String(studentId)
          .trim()
          .toUpperCase();

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

      if (
        examsAttempted !==
        undefined
      ) {
        student.examsAttempted =
          Number(
            examsAttempted
          );
      }

      if (
        totalMarks !==
        undefined
      ) {
        student.totalMarks =
          Number(
            totalMarks
          );
      }

      if (rating !== undefined) {
        student.rating =
          Number(rating);
      }

      await student.save();

      return res.status(200).json({
        success: true,
        message:
          "Exam performance updated successfully",

        performance: {
          examsAttempted:
            student.examsAttempted,

          totalMarks:
            student.totalMarks,

          rating:
            student.rating,
        },
      });
    } catch (error: any) {
      console.error(
        "UPDATE PERFORMANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update exam performance",
        error: error.message,
      });
    }
  };

// ============================================================
// LOGOUT
// ============================================================

export const logoutStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId } =
      req.params;

    const normalizedStudentId =
      String(studentId)
        .trim()
        .toUpperCase();

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
    // RELEASE DEVICE LOCK
    // ========================================================

    student.activeDeviceId =
      null;

    await student.save();

    return res.status(200).json({
      success: true,
      message:
        "Student logged out successfully",
    });
  } catch (error: any) {
    console.error(
      "STUDENT LOGOUT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Logout failed",
      error: error.message,
    });
  }
};

// ============================================================
// DELETE STUDENT
// ============================================================

export const deleteStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId } =
      req.params;

    const normalizedStudentId =
      String(studentId)
        .trim()
        .toUpperCase();

    const student =
      await Student.findOneAndDelete({
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

    return res.status(200).json({
      success: true,
      message:
        "Student deleted successfully",
    });
  } catch (error: any) {
    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete student",
      error: error.message,
    });
  }
};