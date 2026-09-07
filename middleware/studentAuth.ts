import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

import Student from "../models/Student";

// =====================================
// STUDENT JWT PAYLOAD
// =====================================
interface StudentTokenPayload {
  id: string;
  studentId: string;
  name: string;
  email: string;
  mobileNumber?: string;
  classId: string;
  className: string;
  academicYear: string;
  section: string;
  deviceId: string;
  role: string;
}

// =====================================
// STUDENT AUTH
// SINGLE ACTIVE DEVICE
// =====================================
const studentAuth = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // =====================================
    // GET AUTHORIZATION HEADER
    // =====================================
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      res.status(401).json({
        success: false,
        message:
          "Access denied. No token provided.",
      });

      return;
    }

    // =====================================
    // GET TOKEN
    // =====================================
    const token =
      authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message:
          "Authentication token missing.",
      });

      return;
    }

    // =====================================
    // JWT SECRET
    // =====================================
    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        message:
          "JWT_SECRET is missing.",
      });

      return;
    }

    // =====================================
    // VERIFY JWT
    // =====================================
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as StudentTokenPayload;

    // =====================================
    // ROLE CHECK
    // =====================================
    if (
      decoded.role !== "student"
    ) {
      res.status(403).json({
        success: false,
        message:
          "Student access only.",
      });

      return;
    }

    // =====================================
    // DEVICE ID CHECK
    // =====================================
    if (!decoded.deviceId) {
      res.status(401).json({
        success: false,
        message:
          "Invalid student session.",
        code:
          "INVALID_DEVICE_SESSION",
      });

      return;
    }

    // =====================================
    // FIND STUDENT
    // =====================================
    const student =
      await Student.findOne({
        studentId:
          decoded.studentId,
      });

    if (!student) {
      res.status(401).json({
        success: false,
        message:
          "Student account not found.",
        code:
          "STUDENT_NOT_FOUND",
      });

      return;
    }

    // =====================================
    // SINGLE DEVICE CHECK
    // =====================================
    if (
      !student.activeDeviceId ||
      student.activeDeviceId !==
        decoded.deviceId
    ) {
      res.status(401).json({
        success: false,
        message:
          "Your account is active on another device.",
        code:
          "SESSION_REPLACED",
      });

      return;
    }

    // =====================================
    // SAVE AUTH DATA TO REQUEST
    // =====================================
    req.student =
      decoded;

    req.studentAccount =
      student;

    // =====================================
    // CONTINUE
    // =====================================
    next();
  } catch (error) {
    console.error(
      "STUDENT AUTH ERROR:",
      error
    );

    res.status(401).json({
      success: false,
      message:
        "Invalid or expired token.",
      code:
        "INVALID_SESSION",
    });
  }
};

export default studentAuth;