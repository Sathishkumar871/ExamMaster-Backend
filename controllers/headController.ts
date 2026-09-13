import { Response } from "express";

import Student from "../models/Student";
import Result from "../models/Result";
import DepartmentFeedback from "../models/DepartmentFeedback";
import Staff from "../models/Staff";

// ============================================================
// HELPERS
// ============================================================

const getPerformedBy = (req: any): string => {
  return (
    req.user?.name ||
    req.user?.staffName ||
    req.user?.teacherName ||
    req.user?.username ||
    req.user?.email ||
    "Head"
  );
};

const getPerformedByRole = (req: any): string => {
  return (
    req.user?.role ||
    req.user?.userRole ||
    "head"
  );
};

const getActionReason = (
  req: any,
  fallback: string
): string => {
  const reason =
    typeof req.body?.reason === "string"
      ? req.body.reason.trim()
      : "";

  return reason || fallback;
};

// ============================================================
// MENTOR STUDENT QUERY
// ============================================================

const buildMentorStudentQuery = (
  mentor: any
) => {
  const conditions: any[] = [
    {
      mentorId: mentor._id.toString(),
    },
  ];

  if (mentor.mentorId) {
    conditions.push({
      mentorId: mentor.mentorId,
    });
  }

  if (mentor.name) {
    conditions.push({
      mentorName: mentor.name,
    });
  }

  return {
    $or: conditions,
  };
};

// ============================================================
// HEAD DASHBOARD
// GET /api/head/dashboard
// ============================================================

export const getHeadDashboard = async (
  req: any,
  res: Response
) => {
  try {
    const totalStudents =
      await Student.countDocuments();

    const results =
      await Result.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    const feedback =
      await DepartmentFeedback.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    const headComplaints =
      feedback.filter(
        (item: any) =>
          String(
            item.assignedDepartment || ""
          )
            .toLowerCase()
            .trim() === "head"
      );

    const students =
      await Student.find()
        .select(
          "name studentId email className classId academicYear teacherId mentorId mentorCode mentorName mentorAssignedAt previousMentorId previousMentorName previousSection section createdAt updatedAt"
        )
        .lean();

    const staffFilter = {
      role: {
        $in: [
          "mentor",
          "manager",
        ],
      },
    };

    const totalStaff =
      await Staff.countDocuments(
        staffFilter
      );

    const approvedStaff =
      await Staff.countDocuments({
        ...staffFilter,
        isApproved: true,
        status: {
          $ne: "DELETED",
        },
      });

    const pendingStaffCount =
      await Staff.countDocuments({
        ...staffFilter,
        isApproved: false,
        status: {
          $ne: "DELETED",
        },
      });

    const activeStaff =
      await Staff.countDocuments({
        ...staffFilter,
        isApproved: true,
        status: "ACTIVE",
      });

    const inactiveStaff =
      await Staff.countDocuments({
        ...staffFilter,
        status: {
          $in: [
            "INACTIVE",
            "SUSPENDED",
          ],
        },
      });

    const deletedStaff =
      await Staff.countDocuments({
        ...staffFilter,
        status: "DELETED",
      });

    const historyAggregation =
      await Staff.aggregate([
        {
          $match: staffFilter,
        },
        {
          $unwind: "$history",
        },
        {
          $group: {
            _id: "$history.action",
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const historyStats = {
      accepted: 0,
      rejected: 0,
      deactivated: 0,
      reactivated: 0,
      deleted: 0,
      transferred: 0,
    };

    historyAggregation.forEach(
      (entry: any) => {
        const count =
          Number(entry.count) || 0;

        switch (entry._id) {
          case "ACCEPTED":
            historyStats.accepted =
              count;
            break;

          case "REJECTED":
            historyStats.rejected =
              count;
            break;

          case "DEACTIVATED":
            historyStats.deactivated =
              count;
            break;

          case "REACTIVATED":
            historyStats.reactivated =
              count;
            break;

          case "DELETED":
            historyStats.deleted =
              count;
            break;

          case "TRANSFERRED":
            historyStats.transferred =
              count;
            break;

          default:
            break;
        }
      }
    );

    const totalHistory =
      Object.values(
        historyStats
      ).reduce(
        (total, value) =>
          total + value,
        0
      );

    return res.json({
      success: true,

      dashboard: {
        totalStudents,

        totalResults:
          results.length,

        totalFeedback:
          feedback.length,

        totalHeadComplaints:
          headComplaints.length,

        totalStaff,

        approvedStaff,

        pendingStaff:
          pendingStaffCount,

        activeStaff,

        inactiveStaff,

        deletedStaff,

        totalHistory,

        accepted:
          historyStats.accepted,

        rejected:
          historyStats.rejected,

        deactivated:
          historyStats.deactivated,

        reactivated:
          historyStats.reactivated,

        deleted:
          historyStats.deleted,

        transferred:
          historyStats.transferred,
      },

      students,

      results,

      feedback,

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
// GET PENDING STAFF
// GET /api/head/pending-staff
// ============================================================

export const getPendingStaff = async (
  req: any,
  res: Response
) => {
  try {
    const pendingStaff =
      await Staff.find({
        role: {
          $in: [
            "mentor",
            "manager",
          ],
        },

        isApproved: false,

        status: {
          $ne: "DELETED",
        },
      })
        .sort({
          createdAt: -1,
        })
        .lean();

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
    const { id } =
      req.params;

    const staff =
      await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Staff not found",
      });
    }

    if (
      staff.role !== "mentor" &&
      staff.role !== "manager"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only mentor or manager accounts can be approved.",
      });
    }

    if (
      staff.status ===
      "DELETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Deleted staff account cannot be approved.",
      });
    }

    if (
      staff.isApproved === true &&
      staff.status === "ACTIVE"
    ) {
      return res.json({
        success: true,
        message:
          "Staff is already approved and active.",
        staff,
      });
    }

    staff.isApproved =
      true;

    staff.status =
      "ACTIVE";

    if (!staff.accessCode) {
      staff.accessCode =
        "STAFF" +
        Math.floor(
          100000 +
            Math.random() *
              900000
        );
    }

    staff.history.push({
      action:
        "ACCEPTED",

      reason:
        getActionReason(
          req,
          "Staff request approved by Head."
        ),

      performedBy:
        getPerformedBy(req),

      performedByRole:
        getPerformedByRole(req),

      createdAt:
        new Date(),
    });

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
    const { id } =
      req.params;

    const staff =
      await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Staff not found",
      });
    }

    if (
      staff.role !== "mentor" &&
      staff.role !== "manager"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only mentor or manager requests can be rejected.",
      });
    }

    if (
      staff.status ===
      "DELETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This staff account has already been deleted.",
      });
    }

    staff.history.push({
      action:
        "REJECTED",

      reason:
        getActionReason(
          req,
          "Staff request rejected by Head."
        ),

      performedBy:
        getPerformedBy(req),

      performedByRole:
        getPerformedByRole(req),

      createdAt:
        new Date(),
    });

    staff.isApproved =
      false;

    staff.status =
      "INACTIVE";

    staff.sessionsRevokedAt =
      new Date();

    await staff.save();

    return res.json({
      success: true,

      message:
        "Staff Request Rejected",

      staff,
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

// ============================================================
// GET MENTORS
// GET /api/head/mentors
// ============================================================

export const getMentors = async (
  req: any,
  res: Response
) => {
  try {
    const mentorStaff =
      await Staff.find({
        role: "mentor",

        isApproved: true,

        status: {
          $ne: "DELETED",
        },
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    const mentors =
      await Promise.all(
        mentorStaff.map(
          async (
            mentor: any
          ) => {
            const query =
              buildMentorStudentQuery(
                mentor
              );

            const mentorStudents =
              await Student.countDocuments(
                query
              );

            return {
              ...mentor,

              status:
                mentor.status ||
                "ACTIVE",

              studentCount:
                mentorStudents,
            };
          }
        )
      );

    return res.json({
      success: true,
      mentors,
    });
  } catch (error: any) {
    console.error(
      "GET MENTORS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch mentors",
    });
  }
};

// ============================================================
// GET STAFF / MENTOR HISTORY
// GET /api/head/mentor-history
// ============================================================

export const getMentorHistory =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const staffMembers =
        await Staff.find({
          role: {
            $in: [
              "mentor",
              "manager",
            ],
          },
        })
          .select(
            "_id mentorId teacherId name role history"
          )
          .lean();

      const history: any[] =
        [];

      for (
        const staff of staffMembers
      ) {
        const staffHistory =
          Array.isArray(
            staff.history
          )
            ? staff.history
            : [];

        for (
          const entry of staffHistory
        ) {
          history.push({
            _id:
              `${staff._id}_${entry._id}`,

            mentorId:
              staff.mentorId ||
              staff._id.toString(),

            mentorName:
              staff.name,

            role:
              staff.role,

            action:
              entry.action,

            reason:
              entry.reason,

            performedBy:
              entry.performedBy,

            performedByRole:
              entry.performedByRole,

            replacementMentorId:
              entry.replacementMentorId,

            replacementMentorName:
              entry.replacementMentorName,

            oldSection:
              entry.oldSection,

            newSection:
              entry.newSection,

            transferredStudentCount:
              entry.transferredStudentCount,

            transferredStudentIds:
              entry.transferredStudentIds,

            createdAt:
              entry.createdAt,
          });
        }
      }

      history.sort(
        (
          a,
          b
        ) => {
          const first =
            a.createdAt
              ? new Date(
                  a.createdAt
                ).getTime()
              : 0;

          const second =
            b.createdAt
              ? new Date(
                  b.createdAt
                ).getTime()
              : 0;

          return (
            second -
            first
          );
        }
      );

      const stats = {
        accepted:
          history.filter(
            (item) =>
              item.action ===
              "ACCEPTED"
          ).length,

        rejected:
          history.filter(
            (item) =>
              item.action ===
              "REJECTED"
          ).length,

        deactivated:
          history.filter(
            (item) =>
              item.action ===
              "DEACTIVATED"
          ).length,

        reactivated:
          history.filter(
            (item) =>
              item.action ===
              "REACTIVATED"
          ).length,

        deleted:
          history.filter(
            (item) =>
              item.action ===
              "DELETED"
          ).length,

        transferred:
          history.filter(
            (item) =>
              item.action ===
              "TRANSFERRED"
          ).length,
      };

      return res.json({
        success: true,

        history,

        stats,
      });
    } catch (error: any) {
      console.error(
        "GET MENTOR HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch mentor history",
      });
    }
  };

// ============================================================
// DEACTIVATE MENTOR
// PATCH /api/head/mentors/:id/deactivate
// ============================================================

export const deactivateMentor =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      const reason =
        getActionReason(
          req,
          "Mentor deactivated by Head."
        );

      const mentor =
        await Staff.findById(id);

      if (!mentor) {
        return res.status(404).json({
          success: false,
          message:
            "Mentor not found.",
        });
      }

      if (
        mentor.role !==
        "mentor"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only mentor accounts can be deactivated.",
        });
      }

      if (
        mentor.status ===
        "DELETED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deleted mentor cannot be deactivated.",
        });
      }

      if (
        mentor.status ===
        "INACTIVE"
      ) {
        return res.json({
          success: true,
          message:
            "Mentor is already inactive.",
          mentor,
        });
      }

      mentor.status =
        "INACTIVE";

      mentor.isApproved =
        false;

      mentor.sessionsRevokedAt =
        new Date();

      mentor.history.push({
        action:
          "DEACTIVATED",

        reason,

        performedBy:
          getPerformedBy(req),

        performedByRole:
          getPerformedByRole(req),

        createdAt:
          new Date(),
      });

      await mentor.save();

      return res.json({
        success: true,

        message:
          "Mentor deactivated successfully.",

        mentor,
      });
    } catch (error: any) {
      console.error(
        "DEACTIVATE MENTOR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to deactivate mentor.",
      });
    }
  };

// ============================================================
// REACTIVATE MENTOR
// PATCH /api/head/mentors/:id/reactivate
// ============================================================

export const reactivateMentor =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      const reason =
        getActionReason(
          req,
          "Mentor reactivated by Head."
        );

      const mentor =
        await Staff.findById(id);

      if (!mentor) {
        return res.status(404).json({
          success: false,
          message:
            "Mentor not found.",
        });
      }

      if (
        mentor.role !==
        "mentor"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only mentor accounts can be reactivated.",
        });
      }

      if (
        mentor.status ===
        "DELETED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deleted mentor cannot be reactivated.",
        });
      }

      mentor.status =
        "ACTIVE";

      mentor.isApproved =
        true;

      mentor.history.push({
        action:
          "REACTIVATED",

        reason,

        performedBy:
          getPerformedBy(req),

        performedByRole:
          getPerformedByRole(req),

        createdAt:
          new Date(),
      });

      await mentor.save();

      return res.json({
        success: true,

        message:
          "Mentor reactivated successfully.",

        mentor,
      });
    } catch (error: any) {
      console.error(
        "REACTIVATE MENTOR ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to reactivate mentor.",
      });
    }
  };

// ============================================================
// TRANSFER MENTOR STUDENTS
// PATCH /api/head/mentors/:id/transfer
// ============================================================

export const transferMentorStudents =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      const {
        replacementMentorId,
        reason,
        section,
      } = req.body || {};

      const trimmedReason =
        typeof reason === "string"
          ? reason.trim()
          : "";

      if (!replacementMentorId) {
        return res.status(400).json({
          success: false,
          message:
            "Replacement mentor is required.",
        });
      }

      if (!trimmedReason) {
        return res.status(400).json({
          success: false,
          message:
            "Reason is required.",
        });
      }

      const oldMentor =
        await Staff.findById(id);

      if (!oldMentor) {
        return res.status(404).json({
          success: false,
          message:
            "Old mentor not found.",
        });
      }

      if (
        oldMentor.role !==
        "mentor"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Old account is not a mentor.",
        });
      }

      const newMentor =
        await Staff.findOne({
          _id:
            replacementMentorId,

          role: "mentor",

          isApproved: true,

          status: "ACTIVE",
        });

      if (!newMentor) {
        return res.status(400).json({
          success: false,
          message:
            "Replacement mentor is not active.",
        });
      }

      const studentQuery =
        buildMentorStudentQuery(
          oldMentor
        );

      const finalQuery: any = {
        ...studentQuery,
      };

      if (
        typeof section ===
          "string" &&
        section.trim()
      ) {
        finalQuery.section =
          section
            .trim()
            .toUpperCase();
      }

      const students =
        await Student.find(
          finalQuery
        );

      if (
        students.length ===
        0
      ) {
        return res.json({
          success: true,

          message:
            "No students found for transfer.",

          transferredStudentCount:
            0,
        });
      }

      const transferredStudentIds =
        students.map(
          (student: any) =>
            student.studentId
        );

      await Student.updateMany(
        finalQuery,
        {
          $set: {
            previousMentorId:
              oldMentor._id.toString(),

            previousMentorName:
              oldMentor.name,

            previousSection:
              oldMentor.section ||
              "",

            mentorId:
              newMentor._id.toString(),

            mentorCode:
              newMentor.mentorId ||
              "",

            mentorName:
              newMentor.name,

            mentorAssignedAt:
              new Date(),
          },
        }
      );

      oldMentor.history.push({
        action:
          "TRANSFERRED",

        reason:
          trimmedReason,

        performedBy:
          getPerformedBy(req),

        performedByRole:
          getPerformedByRole(req),

        replacementMentorId:
          newMentor.mentorId ||
          newMentor._id.toString(),

        replacementMentorName:
          newMentor.name,

        oldSection:
          oldMentor.section ||
          "",

        newSection:
          newMentor.section ||
          "",

        transferredStudentCount:
          students.length,

        transferredStudentIds,

        createdAt:
          new Date(),
      });

      await oldMentor.save();

      return res.json({
        success: true,

        message:
          `${students.length} students transferred successfully.`,

        transferredStudentCount:
          students.length,

        oldMentor: {
          id:
            oldMentor._id,

          mentorId:
            oldMentor.mentorId,

          name:
            oldMentor.name,
        },

        newMentor: {
          id:
            newMentor._id,

          mentorId:
            newMentor.mentorId,

          name:
            newMentor.name,
        },
      });
    } catch (error: any) {
      console.error(
        "TRANSFER MENTOR STUDENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to transfer students.",
      });
    }
  };

// ============================================================
// DELETE / REMOVE MENTOR
// DELETE /api/head/mentors/:id
// ============================================================

export const deleteMentor = async (
  req: any,
  res: Response
) => {
  try {
    const { id } =
      req.params;

    const {
      reason,
      replacementMentorId,
    } = req.body || {};

    const trimmedReason =
      typeof reason === "string"
        ? reason.trim()
        : "";

    if (!trimmedReason) {
      return res.status(400).json({
        success: false,
        message:
          "Reason is required to remove mentor.",
      });
    }

    const mentor =
      await Staff.findById(id);

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message:
          "Mentor not found.",
      });
    }

    if (
      mentor.role !==
      "mentor"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only mentor accounts can be removed.",
      });
    }

    if (
      mentor.status ===
      "DELETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mentor is already removed.",
      });
    }

    const studentQuery =
      buildMentorStudentQuery(
        mentor
      );

    const students =
      await Student.find(
        studentQuery
      );

    let replacementMentor:
      | any
      | null = null;

    if (
      students.length > 0
    ) {
      if (!replacementMentorId) {
        return res.status(400).json({
          success: false,
          message:
            `This mentor has ${students.length} students. Select a replacement mentor before removing this account.`,
          studentCount:
            students.length,
        });
      }

      replacementMentor =
        await Staff.findOne({
          _id:
            replacementMentorId,

          role: "mentor",

          isApproved: true,

          status: "ACTIVE",
        });

      if (!replacementMentor) {
        return res.status(400).json({
          success: false,
          message:
            "Replacement mentor is not active.",
        });
      }

      if (
        replacementMentor._id.toString() ===
        mentor._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A mentor cannot replace themselves.",
        });
      }

      await Student.updateMany(
        studentQuery,
        {
          $set: {
            previousMentorId:
              mentor._id.toString(),

            previousMentorName:
              mentor.name,

            previousSection:
              mentor.section ||
              "",

            mentorId:
              replacementMentor._id.toString(),

            mentorCode:
              replacementMentor.mentorId ||
              "",

            mentorName:
              replacementMentor.name,

            mentorAssignedAt:
              new Date(),
          },
        }
      );

      mentor.history.push({
        action:
          "TRANSFERRED",

        reason:
          trimmedReason,

        performedBy:
          getPerformedBy(req),

        performedByRole:
          getPerformedByRole(req),

        replacementMentorId:
          replacementMentor.mentorId ||
          replacementMentor._id.toString(),

        replacementMentorName:
          replacementMentor.name,

        oldSection:
          mentor.section ||
          "",

        newSection:
          replacementMentor.section ||
          "",

        transferredStudentCount:
          students.length,

        transferredStudentIds:
          students.map(
            (student: any) =>
              student.studentId
          ),

        createdAt:
          new Date(),
      });
    }

    mentor.status =
      "DELETED";

    mentor.isApproved =
      false;

    mentor.sessionsRevokedAt =
      new Date();

    mentor.replacedByMentorId =
      replacementMentor
        ? replacementMentor.mentorId ||
          replacementMentor._id.toString()
        : undefined;

    mentor.replacedByMentorName =
      replacementMentor
        ? replacementMentor.name
        : undefined;

    mentor.replacedAt =
      replacementMentor
        ? new Date()
        : undefined;

    mentor.history.push({
      action:
        "DELETED",

      reason:
        trimmedReason,

      performedBy:
        getPerformedBy(req),

      performedByRole:
        getPerformedByRole(req),

      replacementMentorId:
        replacementMentor
          ? replacementMentor.mentorId ||
            replacementMentor._id.toString()
          : undefined,

      replacementMentorName:
        replacementMentor
          ? replacementMentor.name
          : undefined,

      oldSection:
        mentor.section ||
        "",

      newSection:
        replacementMentor?.section ||
        "",

      transferredStudentCount:
        students.length,

      transferredStudentIds:
        students.map(
          (student: any) =>
            student.studentId
        ),

      createdAt:
        new Date(),
    });

    await mentor.save();

    return res.json({
      success: true,

      message:
        replacementMentor
          ? `Mentor removed successfully. ${students.length} students transferred to ${replacementMentor.name}.`
          : "Mentor removed successfully.",

      transferredStudentCount:
        students.length,

      replacementMentor:
        replacementMentor
          ? {
              id:
                replacementMentor._id,

              mentorId:
                replacementMentor.mentorId,

              name:
                replacementMentor.name,
            }
          : null,

      mentor,
    });
  } catch (error: any) {
    console.error(
      "DELETE MENTOR ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to remove mentor.",
    });
  }
};

// ============================================================
// CHANGE MENTOR SECTION
// PATCH /api/head/mentors/:id/change-section
// ============================================================

export const changeMentorSection =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      const {
        newSection,
        reason,
      } = req.body || {};

      const section =
        typeof newSection === "string"
          ? newSection
              .trim()
              .toUpperCase()
          : "";

      const trimmedReason =
        typeof reason === "string"
          ? reason.trim()
          : "";

      // ========================================================
      // VALIDATION
      // ========================================================

      if (!section) {
        return res.status(400).json({
          success: false,
          message:
            "New section is required.",
        });
      }

      if (!trimmedReason) {
        return res.status(400).json({
          success: false,
          message:
            "Reason is required.",
        });
      }

      // ========================================================
      // FIND MENTOR
      // ========================================================

      const mentor =
        await Staff.findOne({
          _id: id,
          role: "mentor",
        });

      if (!mentor) {
        return res.status(404).json({
          success: false,
          message:
            "Mentor not found.",
        });
      }

      // ========================================================
      // BLOCK DELETED MENTOR
      // ========================================================

      if (
        mentor.status ===
        "DELETED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deleted mentor section cannot be changed.",
        });
      }

      // ========================================================
      // CHECK SAME SECTION
      // ========================================================

      const oldSection =
        mentor.section || "";

      if (
        oldSection
          .trim()
          .toUpperCase() ===
        section
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mentor is already assigned to this section.",
        });
      }

      // ========================================================
      // UPDATE MENTOR SECTION
      // ========================================================

      mentor.section =
        section;

      // ========================================================
      // SAVE HISTORY
      // ========================================================

      mentor.history.push({
        action:
          "TRANSFERRED",

        reason:
          trimmedReason,

        performedBy:
          getPerformedBy(req),

        performedByRole:
          getPerformedByRole(req),

        oldSection,

        newSection:
          section,

        transferredStudentCount:
          0,

        transferredStudentIds:
          [],

        createdAt:
          new Date(),
      });

      await mentor.save();

      // ========================================================
      // RESPONSE
      // ========================================================

      return res.json({
        success: true,

        message:
          "Mentor section changed successfully.",

        mentor: {
          id:
            mentor._id,

          mentorId:
            mentor.mentorId,

          name:
            mentor.name,

          oldSection,

          newSection:
            mentor.section,
        },
      });
    } catch (error: any) {
      console.error(
        "CHANGE MENTOR SECTION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to change mentor section.",
      });
    }
  };

// ============================================================
// CHANGE STUDENT SECTION
// PATCH /api/head/students/:studentId/change-section
// ============================================================

export const changeStudentSection =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const {
        studentId,
      } = req.params;

      const {
        newSection,
        newMentorId,
        reason,
      } = req.body || {};

      const section =
        typeof newSection === "string"
          ? newSection
              .trim()
              .toUpperCase()
          : "";

      const trimmedReason =
        typeof reason === "string"
          ? reason.trim()
          : "";

      if (!section) {
        return res.status(400).json({
          success: false,
          message:
            "New section is required.",
        });
      }

      if (!trimmedReason) {
        return res.status(400).json({
          success: false,
          message:
            "Reason is required.",
        });
      }

      const student =
        await Student.findOne({
          studentId,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const oldSection =
        student.section;

      const oldMentorId =
        (student as any)
          .mentorId || "";

      const oldMentorName =
        (student as any)
          .mentorName || "";

      let newMentor:
        | any
        | null = null;

      if (newMentorId) {
        newMentor =
          await Staff.findOne({
            _id:
              newMentorId,

            role: "mentor",

            isApproved: true,

            status: "ACTIVE",
          });

        if (!newMentor) {
          return res.status(400).json({
            success: false,
            message:
              "Selected mentor is not active.",
          });
        }
      }

      (student as any)
        .previousSection =
        oldSection;

      (student as any)
        .previousMentorId =
        oldMentorId;

      (student as any)
        .previousMentorName =
        oldMentorName;

      student.section =
        section;

      if (newMentor) {
        (student as any)
          .mentorId =
          newMentor._id.toString();

        (student as any)
          .mentorCode =
          newMentor.mentorId ||
          "";

        (student as any)
          .mentorName =
          newMentor.name;

        (student as any)
          .mentorAssignedAt =
          new Date();
      }

      await student.save();

      if (oldMentorId) {
        const oldMentor =
          await Staff.findOne({
            $or: [
              {
                _id:
                  oldMentorId,
              },
              {
                mentorId:
                  oldMentorId,
              },
            ],
          });

        if (oldMentor) {
          oldMentor.history.push({
            action:
              "TRANSFERRED",

            reason:
              trimmedReason,

            performedBy:
              getPerformedBy(req),

            performedByRole:
              getPerformedByRole(req),

            replacementMentorId:
              newMentor
                ? newMentor.mentorId ||
                  newMentor._id.toString()
                : undefined,

            replacementMentorName:
              newMentor
                ? newMentor.name
                : undefined,

            oldSection,

            newSection:
              section,

            transferredStudentCount:
              1,

            transferredStudentIds: [
              student.studentId,
            ],

            createdAt:
              new Date(),
          });

          await oldMentor.save();
        }
      }

      return res.json({
        success: true,

        message:
          "Student section changed successfully.",

        student,
      });
    } catch (error: any) {
      console.error(
        "CHANGE STUDENT SECTION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to change student section.",
      });
    }
  };

// ============================================================
// GET MENTOR DETAILS
// GET /api/head/mentors/:id/details
// ============================================================

export const getMentorDetails =
  async (
    req: any,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      const mentor =
        await Staff.findOne({
          _id: id,
          role: "mentor",
          status: {
            $ne: "DELETED",
          },
        }).lean();

      if (!mentor) {
        return res.status(404).json({
          success: false,
          message:
            "Mentor not found.",
        });
      }

      const studentQuery =
        buildMentorStudentQuery(
          mentor
        );

      const mentorStudents =
        await Student.find(
          studentQuery
        )
          .select(
            "name studentId email className classId academicYear section mentorId mentorCode mentorName mentorAssignedAt previousMentorId previousMentorName previousSection createdAt updatedAt"
          )
          .sort({
            name: 1,
          })
          .lean();

      const studentIds =
        mentorStudents.map(
          (student: any) =>
            String(
              student.studentId
            )
        );

      const mentorResults =
        studentIds.length > 0
          ? await Result.find({
              studentId: {
                $in:
                  studentIds,
              },
            })
              .sort({
                createdAt: -1,
              })
              .lean()
          : [];

      const percentages =
        mentorResults
          .map(
            (result: any) =>
              Number(
                result.percentage
              )
          )
          .filter(
            (
              value: number
            ) =>
              Number.isFinite(
                value
              )
          );

      const resultCount =
        mentorResults.length;

      const averagePercentage =
        percentages.length > 0
          ? percentages.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
            percentages.length
          : 0;

      const highestPercentage =
        percentages.length > 0
          ? Math.max(
              ...percentages
            )
          : 0;

      const lowestPercentage =
        percentages.length > 0
          ? Math.min(
              ...percentages
            )
          : 0;

      const passedResults =
        mentorResults.filter(
          (result: any) =>
            result.status ===
            "PASS"
        ).length;

      const failedResults =
        mentorResults.filter(
          (result: any) =>
            result.status ===
            "FAIL"
        ).length;

      const passRate =
        resultCount > 0
          ? (passedResults /
              resultCount) *
            100
          : 0;

      const studentsWithResults =
        mentorStudents.map(
          (student: any) => {
            const studentResults =
              mentorResults.filter(
                (result: any) =>
                  String(
                    result.studentId
                  ) ===
                  String(
                    student.studentId
                  )
              );

            const studentScores =
              studentResults
                .map(
                  (result: any) =>
                    Number(
                      result.percentage
                    )
                )
                .filter(
                  (
                    value: number
                  ) =>
                    Number.isFinite(
                      value
                    )
                );

            const studentAverage =
              studentScores.length >
              0
                ? studentScores.reduce(
                    (
                      sum,
                      value
                    ) =>
                      sum + value,
                    0
                  ) /
                  studentScores.length
                : 0;

            return {
              ...student,

              resultCount:
                studentResults.length,

              averagePercentage:
                Number(
                  studentAverage.toFixed(
                    2
                  )
                ),

              passed:
                studentResults.filter(
                  (result: any) =>
                    result.status ===
                    "PASS"
                ).length,

              failed:
                studentResults.filter(
                  (result: any) =>
                    result.status ===
                    "FAIL"
                ).length,

              results:
                studentResults,
            };
          }
        );

      const sectionMap =
        new Map<
          string,
          {
            section: string;
            studentCount: number;
            resultCount: number;
          }
        >();

      for (
        const student of
          mentorStudents
      ) {
        const section =
          student.section?.trim() ||
          "UNASSIGNED";

        if (
          !sectionMap.has(
            section
          )
        ) {
          sectionMap.set(
            section,
            {
              section,

              studentCount:
                0,

              resultCount:
                0,
            }
          );
        }

        const sectionEntry =
          sectionMap.get(
            section
          )!;

        sectionEntry.studentCount +=
          1;

        sectionEntry.resultCount +=
          mentorResults.filter(
            (result: any) =>
              String(
                result.studentId
              ) ===
              String(
                student.studentId
              )
          ).length;
      }

      const sections =
        Array.from(
          sectionMap.values()
        ).sort(
          (a, b) =>
            a.section.localeCompare(
              b.section,
              undefined,
              {
                numeric:
                  true,
                sensitivity:
                  "base",
              }
            )
        );

      return res.json({
        success: true,

        mentor: {
          ...mentor,

          status:
            mentor.status ||
            "ACTIVE",

          studentCount:
            mentorStudents.length,

          resultCount,

          averagePercentage:
            Number(
              averagePercentage.toFixed(
                2
              )
            ),

          highestPercentage:
            Number(
              highestPercentage.toFixed(
                2
              )
            ),

          lowestPercentage:
            Number(
              lowestPercentage.toFixed(
                2
              )
            ),

          passedResults,

          failedResults,

          passRate:
            Number(
              passRate.toFixed(
                2
              )
            ),
        },

        students:
          studentsWithResults,

        results:
          mentorResults,

        sections,
      });
    } catch (error: any) {
      console.error(
        "GET MENTOR DETAILS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load mentor details.",
      });
    }
  };