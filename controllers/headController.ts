import { Response } from "express";

import Student from "../models/Student";
import Result from "../models/Result";
import DepartmentFeedback from "../models/DepartmentFeedback";
import Staff from "../models/Staff";

// ============================================================
// HEAD DASHBOARD DATA
// GET /api/head/dashboard
// ============================================================

export const getHeadDashboard = async (
  req: any,
  res: Response
) => {
  try {
    // ========================================================
    // TOTAL STUDENTS
    // ========================================================

    const totalStudents = await Student.countDocuments();

    // ========================================================
    // ALL RESULTS
    // ========================================================

    const results = await Result.find()
      .sort({
        createdAt: -1,
      })
      .lean();

    // ========================================================
    // ALL DEPARTMENT FEEDBACK
    // ========================================================

    const feedback = await DepartmentFeedback.find()
      .sort({
        createdAt: -1,
      })
      .lean();

    // ========================================================
    // HEAD COMPLAINTS
    // ========================================================
    //
    // Mentor selected HEAD
    //      ↓
    // assignedDepartment = "head"
    //
    // Those complaints are shown in Head Dashboard.
    //
    // ========================================================

    const headComplaints = feedback.filter(
      (item: any) =>
        String(item.assignedDepartment || "")
          .toLowerCase()
          .trim() === "head"
    );

    // ========================================================
    // STUDENTS
    // ========================================================

    const students = await Student.find()
      .select(
        "name studentId className classId teacherId section"
      )
      .lean();

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      success: true,

      dashboard: {
        totalStudents,

        totalResults: results.length,

        // Total department feedback
        totalFeedback: feedback.length,

        // Specifically Head complaints
        totalHeadComplaints: headComplaints.length,
      },

      students,

      results,

      // Existing feedback
      feedback,

      // Head-specific complaints
      headComplaints,
    });
  } catch (error: any) {
    console.error(
      "GET HEAD DASHBOARD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load head dashboard",
    });
  }
};

// ============================================================
// GET PENDING STAFF REQUESTS
// GET /api/head/pending-staff
// ============================================================

export const getPendingStaff = async (
  req: any,
  res: Response
) => {
  try {
    const pendingStaff = await Staff.find({
      role: {
        $in: [
          "mentor",
          "manager",
        ],
      },

      isApproved: false,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      staff: pendingStaff,
    });
  } catch (error: any) {
    console.error(
      "GET PENDING STAFF ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch pending staff",
    });
  }
};

// ============================================================
// APPROVE STAFF
// PUT /api/head/approve/:id
// ============================================================

export const approveStaff = async (
  req: any,
  res: Response
) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    staff.isApproved = true;

    // ========================================================
    // GENERATE ACCESS CODE AFTER APPROVAL
    // ========================================================

    if (!staff.accessCode) {
      staff.accessCode =
        "STAFF" +
        Math.floor(
          100000 +
            Math.random() * 900000
        );
    }

    await staff.save();

    return res.json({
      success: true,

      message:
        "Staff Approved Successfully",

      staff,
    });
  } catch (error: any) {
    console.error(
      "APPROVE STAFF ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to approve staff",
    });
  }
};

// ============================================================
// REJECT STAFF
// DELETE /api/head/reject/:id
// ============================================================

export const rejectStaff = async (
  req: any,
  res: Response
) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    await Staff.findByIdAndDelete(id);

    return res.json({
      success: true,

      message:
        "Staff Request Rejected",
    });
  } catch (error: any) {
    console.error(
      "REJECT STAFF ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to reject staff",
    });
  }
};