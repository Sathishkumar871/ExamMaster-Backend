
import express, {
  Request,
  Response,
} from "express";

import Complaint from "../models/Complaint";

const router = express.Router();


// ============================================================
// 1. STUDENT
// SUBMIT NEW COMPLAINT / REQUIREMENT
// LIMIT: 1 PER WEEK
// ============================================================

router.post(
  "/student/complaint",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {

      const {
        studentId,
        studentName,
        className,
        classId,
        description,
      } = req.body;


      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (
        !studentId ||
        !description ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID and complaint description are required.",
        });
      }


      const cleanDescription =
        description.trim();


      if (
        cleanDescription.length > 300
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Complaint cannot exceed 300 characters.",
        });
      }


      // --------------------------------------------------------
      // START OF CURRENT WEEK
      // MONDAY 00:00:00
      // --------------------------------------------------------

      const now =
        new Date();

      const dayOfWeek =
        now.getDay();

      const diffToMonday =
        now.getDate() -
        dayOfWeek +
        (dayOfWeek === 0
          ? -6
          : 1);

      const startOfWeek =
        new Date(now);

      startOfWeek.setDate(
        diffToMonday
      );

      startOfWeek.setHours(
        0,
        0,
        0,
        0
      );


      // --------------------------------------------------------
      // WEEKLY LIMIT
      // --------------------------------------------------------

      const existingThisWeek =
        await Complaint.findOne({
          studentId,
          createdAt: {
            $gte: startOfWeek,
          },
        });


      if (existingThisWeek) {

        return res.status(400).json({
          success: false,
          message:
            "⚠️ You can only submit 1 complaint/requirement per week.",
        });

      }


      // --------------------------------------------------------
      // CREATE COMPLAINT
      // --------------------------------------------------------

      const newComplaint =
        await Complaint.create({

          studentId,

          studentName:
            studentName ||
            "Student",

          className:
            className ||
            "N/A",

          classId:
            classId ||
            "N/A",

          description:
            cleanDescription,

          status:
            "Pending",

          managementReply:
            "",

          repliedBy:
            "",

          repliedAt:
            null,

          resolvedAt:
            null,

        });


      console.log(
        "✅ STUDENT COMPLAINT SAVED:",
        {
          id:
            newComplaint._id,
          studentId:
            newComplaint.studentId,
        }
      );


      return res.status(201).json({

        success: true,

        message:
          "Complaint/Requirement submitted successfully.",

        complaint:
          newComplaint,

      });

    } catch (error: any) {

      console.error(
        "❌ Error submitting complaint:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while submitting complaint.",

      });

    }
  }
);


// ============================================================
// 2. STUDENT
// GET OWN COMPLAINT HISTORY
// ============================================================

router.get(
  "/student/complaints/:studentId",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const {
        studentId,
      } = req.params;


      if (!studentId) {

        return res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

      }


      const complaints =
        await Complaint.find({
          studentId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();


      return res.status(200).json({

        success: true,

        complaints,

      });

    } catch (error: any) {

      console.error(
        "❌ Error fetching student complaints:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while fetching student complaints.",

      });

    }

  }
);


// ============================================================
// 3. STUDENT
// DELETE / CANCEL PENDING COMPLAINT
// ============================================================

router.delete(
  "/student/complaint/:id",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const {
        id,
      } = req.params;


      const complaint =
        await Complaint.findById(id);


      if (!complaint) {

        return res.status(404).json({
          success: false,
          message:
            "Complaint not found.",
        });

      }


      // --------------------------------------------------------
      // RESOLVED COMPLAINT CANNOT BE DELETED
      // --------------------------------------------------------

      if (
        complaint.status ===
        "Resolved"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Resolved complaint cannot be deleted.",
        });

      }


      await Complaint.findByIdAndDelete(
        id
      );


      console.log(
        "🗑️ Complaint deleted:",
        id
      );


      return res.status(200).json({

        success: true,

        message:
          "Complaint deleted successfully.",

      });

    } catch (error: any) {

      console.error(
        "❌ Error deleting complaint:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while deleting complaint.",

      });

    }

  }
);


// ============================================================
// 4. MANAGEMENT
// GET ALL STUDENT COMPLAINTS
// ============================================================

router.get(
  "/teacher/complaints",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      console.log(
        "📢 MANAGEMENT: FETCHING STUDENT COMPLAINTS"
      );


      const complaints =
        await Complaint.find({})
          .sort({
            createdAt: -1,
          })
          .lean();


      // --------------------------------------------------------
      // COUNTS
      // --------------------------------------------------------

      const total =
        complaints.length;


      const pending =
        complaints.filter(
          (item: any) =>
            !item.status ||
            item.status ===
              "Pending"
        ).length;


      const resolved =
        complaints.filter(
          (item: any) =>
            item.status ===
            "Resolved"
        ).length;


      console.log(
        "📊 COMPLAINT COUNTS:",
        {
          total,
          pending,
          resolved,
        }
      );


      return res.status(200).json({

        success: true,

        counts: {
          total,
          pending,
          resolved,
        },

        complaints,

      });

    } catch (error: any) {

      console.error(
        "❌ Error fetching management complaints:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while fetching management complaints.",

      });

    }

  }
);


// ============================================================
// 5. MANAGEMENT
// SEND MESSAGE / RESPONSE TO STUDENT
// ============================================================

router.put(
  "/teacher/complaint/:id/reply",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const {
        id,
      } = req.params;


      const {
        message,
        repliedBy,
      } = req.body;


      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (
        !message ||
        !message.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Response message is required.",

        });

      }


      const cleanMessage =
        message.trim();


      if (
        cleanMessage.length > 1000
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Response cannot exceed 1000 characters.",

        });

      }


      // --------------------------------------------------------
      // FIND COMPLAINT
      // --------------------------------------------------------

      const complaint =
        await Complaint.findById(id);


      if (!complaint) {

        return res.status(404).json({

          success: false,

          message:
            "Complaint not found.",

        });

      }


      // --------------------------------------------------------
      // SAVE MANAGEMENT RESPONSE
      // --------------------------------------------------------

      complaint.managementReply =
        cleanMessage;

      complaint.repliedBy =
        repliedBy ||
        "Management";

      complaint.repliedAt =
        new Date();


      await complaint.save();


      console.log(
        "💬 MANAGEMENT RESPONSE SENT:",
        {
          complaintId:
            complaint._id,

          studentId:
            complaint.studentId,
        }
      );


      return res.status(200).json({

        success: true,

        message:
          "Response sent successfully.",

        complaint,

      });

    } catch (error: any) {

      console.error(
        "❌ Error sending management response:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while sending response.",

      });

    }

  }
);


// ============================================================
// 6. MANAGEMENT
// MARK COMPLAINT AS RESOLVED
// ============================================================

router.put(
  "/teacher/complaint/:id",
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const {
        id,
      } = req.params;


      const complaint =
        await Complaint.findById(id);


      if (!complaint) {

        return res.status(404).json({

          success: false,

          message:
            "Complaint not found.",

        });

      }


      // --------------------------------------------------------
      // ALREADY RESOLVED
      // --------------------------------------------------------

      if (
        complaint.status ===
        "Resolved"
      ) {

        return res.status(200).json({

          success: true,

          message:
            "Complaint is already resolved.",

          updatedComplaint:
            complaint,

        });

      }


      // --------------------------------------------------------
      // RESOLVE
      // --------------------------------------------------------

      complaint.status =
        "Resolved";

      complaint.resolvedAt =
        new Date();


      await complaint.save();


      console.log(
        "✅ COMPLAINT RESOLVED:",
        {
          complaintId:
            complaint._id,

          studentId:
            complaint.studentId,
        }
      );


      return res.status(200).json({

        success: true,

        message:
          "Complaint marked as resolved.",

        updatedComplaint:
          complaint,

      });

    } catch (error: any) {

      console.error(
        "❌ Error updating complaint:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Server error while updating complaint.",

      });

    }

  }
);


// ============================================================
// EXPORT
// ============================================================

export default router;

