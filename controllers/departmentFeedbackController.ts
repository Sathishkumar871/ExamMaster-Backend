import { Request, Response } from "express";

import DepartmentFeedback from "../models/DepartmentFeedback";
import Student from "../models/Student";

// ============================================================
// TYPES
// ============================================================

type Department =
  | "management"
  | "director"
  | "warden"
  | "head";

type FeedbackStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "ESCALATED";

type UserRole =
  | "mentor"
  | "student"
  | "manager"
  | "director"
  | "head"
  | "warden";

// ============================================================
// DEPARTMENT ORDER
// ============================================================
//
// IMPORTANT:
//
// Management → Director → Warden
//
// Head is NOT part of this sequence.
//
// Mentor can directly send to Head.
//
// ============================================================

const DEPARTMENT_ORDER: Department[] = [
  "management",
  "director",
  "warden",
];

// ============================================================
// NORMALIZE DEPARTMENT
// ============================================================

const normalizeDepartment = (
  value: unknown
): Department | null => {
  const department = String(
    value || ""
  )
    .toLowerCase()
    .trim();

  if (
    department === "management" ||
    department === "director" ||
    department === "warden" ||
    department === "head"
  ) {
    return department;
  }

  return null;
};

// ============================================================
// GET LOGGED USER
// ============================================================

const getLoggedUser = (
  req: Request
): any => {
  const request = req as any;

  return (
    request.teacher ||
    request.staff ||
    request.user ||
    null
  );
};

// ============================================================
// GET USER ID
// ============================================================

const getUserId = (
  req: Request
): string => {
  const user =
    getLoggedUser(req);

  return String(
    user?.teacherId ||
      user?.staffId ||
      user?.userId ||
      user?.id ||
      user?._id ||
      ""
  ).trim();
};

// ============================================================
// GET USER ROLE
// ============================================================

const getUserRole = (
  req: Request
): UserRole | "" => {
  const user =
    getLoggedUser(req);

  const role = String(
    user?.updatedByRole ||
      user?.role ||
      user?.teacherType ||
      ""
  )
    .toLowerCase()
    .trim();

  if (
    role === "mentor" ||
    role === "student" ||
    role === "manager" ||
    role === "director" ||
    role === "head" ||
    role === "warden"
  ) {
    return role;
  }

  return "";
};

// ============================================================
// DEFAULT ROLE FOR DEPARTMENT
// ============================================================

const getDepartmentRole = (
  department: Department
): UserRole => {
  switch (department) {
    case "management":
      return "manager";

    case "director":
      return "director";

    case "warden":
      return "warden";

    case "head":
      return "head";

    default:
      return "head";
  }
};

// ============================================================
// DEFAULT ACTOR NAME
// ============================================================

const getDepartmentActorName = (
  department: Department
): string => {
  switch (department) {
    case "management":
      return "Management";

    case "director":
      return "Director";

    case "warden":
      return "Warden";

    case "head":
      return "Head";

    default:
      return "Department";
  }
};

// ============================================================
// CHECK DEPARTMENT ACCESS
// ============================================================

const isAuthorizedForDepartment = (
  role: UserRole,
  department: Department
): boolean => {
  if (
    department === "management"
  ) {
    return (
      role === "manager" ||
      role === "head"
    );
  }

  if (
    department === "director"
  ) {
    return (
      role === "director" ||
      role === "head"
    );
  }

  if (
    department === "warden"
  ) {
    return (
      role === "warden" ||
      role === "head"
    );
  }

  if (
    department === "head"
  ) {
    return role === "head";
  }

  return false;
};

// ============================================================
// GET NEXT DEPARTMENT
// ============================================================

const getNextDepartment = (
  currentDepartment: Department
): Department | null => {
  const index =
    DEPARTMENT_ORDER.indexOf(
      currentDepartment
    );

  if (index === -1) {
    return null;
  }

  return (
    DEPARTMENT_ORDER[index + 1] ||
    null
  );
};

// ============================================================
// SET RESOLUTION FIELD
// ============================================================

const setDepartmentActionPlan = (
  feedback: any,
  department: Department,
  actionPlan: string
) => {
  if (
    department === "management"
  ) {
    feedback.managementActionPlan =
      actionPlan;
    return;
  }

  if (
    department === "director"
  ) {
    feedback.directorActionPlan =
      actionPlan;
    return;
  }

  if (
    department === "warden"
  ) {
    feedback.wardenActionPlan =
      actionPlan;
    return;
  }

  if (
    department === "head"
  ) {
    feedback.headActionPlan =
      actionPlan;
    return;
  }
};

// ============================================================
// GET RESOLUTION FIELD
// ============================================================

const getDepartmentActionPlan = (
  feedback: any,
  department: Department
): string => {
  if (
    department === "management"
  ) {
    return String(
      feedback.managementActionPlan ||
        ""
    ).trim();
  }

  if (
    department === "director"
  ) {
    return String(
      feedback.directorActionPlan ||
        ""
    ).trim();
  }

  if (
    department === "warden"
  ) {
    return String(
      feedback.wardenActionPlan ||
        ""
    ).trim();
  }

  if (
    department === "head"
  ) {
    return String(
      feedback.headActionPlan ||
        ""
    ).trim();
  }

  return "";
};

// ============================================================
// 1. MENTOR CREATE / UPDATE ACADEMIC EVALUATION
// ============================================================
//
// Mentor sends:
//
// studentId
// ratings
// averageRating
// mentorActionPlan
// selectedDepartment
//
// Backend gets student information from Student collection.
//
// ============================================================

export const saveMentorAcademicEvaluation =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        studentId,
      } = req.params;

      const {
        ratings,
        averageRating,
        mentorActionPlan,
        selectedDepartment,
      } = req.body;

      // ======================================================
      // STUDENT ID
      // ======================================================

      if (!studentId) {
        res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

        return;
      }

      // ======================================================
      // DEPARTMENT
      // ======================================================

      const department =
        normalizeDepartment(
          selectedDepartment
        );

      if (!department) {
        res.status(400).json({
          success: false,
          message:
            "Please select Management, Director, Warden or Head.",
        });

        return;
      }

      // ======================================================
      // RATINGS
      // ======================================================

      if (
        !ratings ||
        typeof ratings !==
          "object"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Academic ratings are required.",
        });

        return;
      }

      const requiredRatings = [
        "attendance",
        "subjectUnderstanding",
        "examPerformance",
        "homeworkCompletion",
        "learningInterest",
      ] as const;

      for (
        const field of requiredRatings
      ) {
        const value =
          Number(
            ratings[field]
          );

        if (
          !Number.isFinite(
            value
          ) ||
          value < 1 ||
          value > 5
        ) {
          res.status(400).json({
            success: false,
            message:
              `${field} must be between 1 and 5.`,
          });

          return;
        }
      }

      // ======================================================
      // MENTOR ACTION PLAN
      // ======================================================

      const cleanMentorActionPlan =
        String(
          mentorActionPlan || ""
        ).trim();

      if (
        !cleanMentorActionPlan
      ) {
        res.status(400).json({
          success: false,
          message:
            "Mentor Action Plan is required.",
        });

        return;
      }

      // ======================================================
      // MENTOR
      // ======================================================

      const mentorId =
        getUserId(req);

      if (!mentorId) {
        res.status(401).json({
          success: false,
          message:
            "Unable to identify logged-in mentor.",
        });

        return;
      }

      // ======================================================
      // GET STUDENT FROM DATABASE
      // ======================================================
      //
      // Frontend does NOT send:
      //
      // studentName
      // classId
      // className
      // section
      //
      // We get all of them directly from Student collection.
      //
      // ======================================================

      const student =
        await Student.findOne({
          studentId,
        }).lean();

      if (!student) {
        res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });

        return;
      }

      // ======================================================
      // STUDENT DETAILS
      // ======================================================

      const finalStudentName =
        String(
          student.name || ""
        ).trim();

      const finalClassId =
        String(
          student.classId || ""
        ).trim();

      const finalClassName =
        String(
          student.className || ""
        ).trim();

      const finalSection =
        String(
          student.section || ""
        ).trim();

      // ======================================================
      // STUDENT PROFILE VALIDATION
      // ======================================================

      if (
        !finalStudentName ||
        !finalClassId ||
        !finalClassName ||
        !finalSection
      ) {
        res.status(400).json({
          success: false,
          message:
            "Student profile is incomplete. Please check name, class, section and class ID in Student record.",
        });

        return;
      }

      // ======================================================
      // EXISTING FEEDBACK
      // ======================================================

      const existingFeedback =
        await DepartmentFeedback.findOne({
          studentId,
        });

      // ======================================================
      // AVERAGE
      // ======================================================

      const calculatedAverage =
        (
          Number(
            ratings.attendance
          ) +
          Number(
            ratings.subjectUnderstanding
          ) +
          Number(
            ratings.examPerformance
          ) +
          Number(
            ratings.homeworkCompletion
          ) +
          Number(
            ratings.learningInterest
          )
        ) / 5;

      const finalAverageRating =
        Number.isFinite(
          Number(
            averageRating
          )
        )
          ? Number(
              averageRating
            )
          : Number(
              calculatedAverage.toFixed(
                1
              )
            );

      // ======================================================
      // MENTOR EVALUATION
      // ======================================================

      const mentorEvaluation = {
        attendance:
          Number(
            ratings.attendance
          ),

        subjectUnderstanding:
          Number(
            ratings.subjectUnderstanding
          ),

        examPerformance:
          Number(
            ratings.examPerformance
          ),

        homeworkCompletion:
          Number(
            ratings.homeworkCompletion
          ),

        learningInterest:
          Number(
            ratings.learningInterest
          ),

        averageRating:
          finalAverageRating,
      };

      // ======================================================
      // UPDATE DATA
      // ======================================================

      const updateData: any = {
        studentId,

        studentName:
          finalStudentName,

        classId:
          finalClassId,

        className:
          finalClassName,

        section:
          finalSection,

        mentorEvaluation,

        mentorActionPlan:
          cleanMentorActionPlan,

        originalDepartment:
          existingFeedback
            ?.originalDepartment ||
          department,

        assignedDepartment:
          department,

        status:
          "PENDING" as FeedbackStatus,

        assignedAt:
          new Date(),

        resolvedAt:
          null,

        escalatedAt:
          null,

        escalationReason:
          "",

        sourceType:
          "mentor",

        updatedBy:
          mentorId,

        updatedByRole:
          "mentor",
      };

      // ======================================================
      // SAVE
      // ======================================================

      const feedback =
        await DepartmentFeedback.findOneAndUpdate(
          {
            studentId,
          },

          {
            $set:
              updateData,
          },

          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true,
          }
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(
        existingFeedback
          ? 200
          : 201
      ).json({
        success: true,

        message:
          existingFeedback
            ? "Mentor evaluation updated successfully."
            : "Mentor evaluation saved successfully.",

        studentId,

        assignedDepartment:
          department,

        status:
          feedback?.status,

        feedback,
      });
    } catch (error: any) {
      console.error(
        "saveMentorAcademicEvaluation error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        res.status(409).json({
          success: false,
          message:
            "A feedback record already exists for this student.",
        });

        return;
      }

      res.status(500).json({
        success: false,

        message:
          "Failed to save academic evaluation.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error?.message
            : undefined,
      });
    }
  };

// ============================================================
// 2. GET ONE STUDENT FEEDBACK
// ============================================================

export const getStudentDepartmentFeedback =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        studentId,
      } = req.params;

      if (!studentId) {
        res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

        return;
      }

      const feedback =
        await DepartmentFeedback.findOne({
          studentId,
        }).lean();

      if (!feedback) {
        res.status(404).json({
          success: false,
          message:
            "Student feedback not found.",
        });

        return;
      }

      const workflow = {
        management: {
          actionPlan:
            feedback.managementActionPlan ||
            "",

          completed:
            Boolean(
              feedback.managementActionPlan
            ),
        },

        director: {
          actionPlan:
            feedback.directorActionPlan ||
            "",

          completed:
            Boolean(
              feedback.directorActionPlan
            ),
        },

        warden: {
          actionPlan:
            feedback.wardenActionPlan ||
            "",

          completed:
            Boolean(
              feedback.wardenActionPlan
            ),
        },

        head: {
          actionPlan:
            feedback.headActionPlan ||
            "",

          completed:
            Boolean(
              feedback.headActionPlan
            ),
        },
      };

      res.json({
        success: true,

        feedback,

        workflow,
      });
    } catch (error) {
      console.error(
        "getStudentDepartmentFeedback error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch student feedback.",
      });
    }
  };

// ============================================================
// 3. GET DEPARTMENT QUEUE
// ============================================================

export const getDepartmentFeedback =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const department =
        normalizeDepartment(
          req.params.department
        );

      if (!department) {
        res.status(400).json({
          success: false,
          message:
            "Invalid department. Use management, director, warden or head.",
        });

        return;
      }

      const requestedStatus =
        typeof req.query.status ===
        "string"
          ? req.query.status
          : "";

      const query: any = {
        assignedDepartment:
          department,
      };

      // ======================================================
      // STATUS
      // ======================================================

      if (
        [
          "PENDING",
          "IN_PROGRESS",
          "RESOLVED",
          "ESCALATED",
        ].includes(
          requestedStatus
        )
      ) {
        query.status =
          requestedStatus;
      } else {
        query.status = {
          $in: [
            "PENDING",
            "IN_PROGRESS",
            "ESCALATED",
          ],
        };
      }

      // ======================================================
      // GET FEEDBACK
      // ======================================================

      const feedback =
        await DepartmentFeedback.find(
          query
        )
          .sort({
            status: 1,
            escalatedAt: -1,
            assignedAt: -1,
            updatedAt: -1,
          })
          .lean();

      res.json({
        success: true,

        department,

        count:
          feedback.length,

        feedback,
      });
    } catch (error) {
      console.error(
        "getDepartmentFeedback error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch department feedback.",
      });
    }
  };

// ============================================================
// 4. MARK AS IN PROGRESS
// ============================================================

export const startDepartmentFeedback =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        studentId,
      } = req.params;

      if (!studentId) {
        res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

        return;
      }

      const currentUserId =
        getUserId(req);

      const currentRole =
        getUserRole(req);

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message:
            "Unauthorized.",
        });

        return;
      }

      if (!currentRole) {
        res.status(403).json({
          success: false,
          message:
            "User role could not be identified.",
        });

        return;
      }

      const feedback =
        await DepartmentFeedback.findOne({
          studentId,
        });

      if (!feedback) {
        res.status(404).json({
          success: false,
          message:
            "Feedback not found.",
        });

        return;
      }

      const department =
        normalizeDepartment(
          feedback.assignedDepartment
        );

      if (!department) {
        res.status(400).json({
          success: false,
          message:
            "No valid department is assigned to this feedback.",
        });

        return;
      }

      // ======================================================
      // ACCESS
      // ======================================================

      if (
        !isAuthorizedForDepartment(
          currentRole,
          department
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            `You are not authorized to handle ${department} feedback.`,
        });

        return;
      }

      // ======================================================
      // ALREADY RESOLVED
      // ======================================================

      if (
        feedback.status ===
        "RESOLVED"
      ) {
        res.status(400).json({
          success: false,
          message:
            "This feedback is already resolved.",
        });

        return;
      }

      // ======================================================
      // UPDATE
      // ======================================================

      feedback.status =
        "IN_PROGRESS";

      feedback.updatedBy =
        currentUserId;

      feedback.updatedByRole =
        currentRole;

      await feedback.save();

      res.json({
        success: true,

        message:
          "Feedback marked as in progress.",

        feedback,
      });
    } catch (error) {
      console.error(
        "startDepartmentFeedback error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update feedback status.",
      });
    }
  };

// ============================================================
// 5. RESOLVE CURRENT DEPARTMENT
// ============================================================
//
// MANAGEMENT
//      ↓
// DIRECTOR
//      ↓
// WARDEN
//      ↓
// FINAL RESOLVED
//
// HEAD
//      ↓
// FINAL RESOLVED
//
// ============================================================

export const resolveDepartmentFeedback =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        studentId,
      } = req.params;

      const {
        actionPlan,
        managementActionPlan,
        directorActionPlan,
        wardenActionPlan,
        headActionPlan,
        resolution,
      } = req.body;

      // ======================================================
      // STUDENT ID
      // ======================================================

      if (!studentId) {
        res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

        return;
      }

      // ======================================================
      // FIND FEEDBACK
      // ======================================================

      const feedback =
        await DepartmentFeedback.findOne({
          studentId,
        });

      if (!feedback) {
        res.status(404).json({
          success: false,
          message:
            "Feedback not found.",
        });

        return;
      }

      // ======================================================
      // CURRENT DEPARTMENT
      // ======================================================

      const department =
        normalizeDepartment(
          feedback.assignedDepartment
        );

      if (!department) {
        res.status(400).json({
          success: false,
          message:
            "This feedback does not have a valid assigned department.",
        });

        return;
      }

      // ======================================================
      // CURRENT USER
      // ======================================================

      const loggedUserId =
        getUserId(req);

      const loggedRole =
        getUserRole(req);

      let actorId =
        loggedUserId;

      let actorRole =
        loggedRole;

      // ======================================================
      // FALLBACK
      // ======================================================

      if (!actorId) {
        actorId =
          getDepartmentActorName(
            department
          );
      }

      if (!actorRole) {
        actorRole =
          getDepartmentRole(
            department
          );
      }

      // ======================================================
      // AUTHORIZATION
      // ======================================================

      if (
        loggedRole &&
        !isAuthorizedForDepartment(
          loggedRole,
          department
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            `You are not authorized to resolve ${department} feedback.`,
        });

        return;
      }

      // ======================================================
      // ACTION PLAN
      // ======================================================

      let cleanActionPlan =
        "";

      if (
        department ===
        "management"
      ) {
        cleanActionPlan =
          String(
            managementActionPlan ||
              actionPlan ||
              resolution ||
              ""
          ).trim();
      }

      if (
        department ===
        "director"
      ) {
        cleanActionPlan =
          String(
            directorActionPlan ||
              actionPlan ||
              resolution ||
              ""
          ).trim();
      }

      if (
        department ===
        "warden"
      ) {
        cleanActionPlan =
          String(
            wardenActionPlan ||
              actionPlan ||
              resolution ||
              ""
          ).trim();
      }

      if (
        department ===
        "head"
      ) {
        cleanActionPlan =
          String(
            headActionPlan ||
              actionPlan ||
              resolution ||
              ""
          ).trim();
      }

      // ======================================================
      // VALIDATE
      // ======================================================

      if (
        !cleanActionPlan
      ) {
        res.status(400).json({
          success: false,
          message:
            "Resolution details are required.",
        });

        return;
      }

      // ======================================================
      // PREVENT DUPLICATE
      // ======================================================

      const existingActionPlan =
        getDepartmentActionPlan(
          feedback,
          department
        );

      if (
        existingActionPlan
      ) {
        res.status(400).json({
          success: false,
          message:
            `${department} has already entered a resolution for this feedback.`,
        });

        return;
      }

      // ======================================================
      // SAVE ACTION PLAN
      // ======================================================

      setDepartmentActionPlan(
        feedback,
        department,
        cleanActionPlan
      );

      // ======================================================
      // HEAD → FINAL RESOLUTION
      // ======================================================

      if (
        department ===
        "head"
      ) {
        feedback.assignedDepartment =
          "head";

        feedback.status =
          "RESOLVED";

        feedback.resolvedAt =
          new Date();

        feedback.assignedAt =
          feedback.assignedAt ||
          new Date();

        feedback.updatedBy =
          actorId;

        feedback.updatedByRole =
          actorRole;

        feedback.escalatedAt =
          null;

        feedback.escalationReason =
          "";

        await feedback.save();

        res.status(200).json({
          success: true,

          message:
            "Head response saved. Complaint resolved successfully.",

          studentId,

          previousDepartment:
            "head",

          department:
            "head",

          nextDepartment:
            null,

          status:
            feedback.status,

          resolution:
            cleanActionPlan,

          resolvedAt:
            feedback.resolvedAt,

          feedback,
        });

        return;
      }

      // ======================================================
      // MANAGEMENT → DIRECTOR
      // ======================================================

      const nextDepartment =
        getNextDepartment(
          department
        );

      if (
        department ===
          "management" &&
        nextDepartment ===
          "director"
      ) {
        feedback.assignedDepartment =
          "director";

        feedback.status =
          "PENDING";

        feedback.assignedAt =
          new Date();

        feedback.resolvedAt =
          null;

        feedback.escalatedAt =
          null;

        feedback.escalationReason =
          "";

        feedback.updatedBy =
          actorId;

        feedback.updatedByRole =
          actorRole;

        await feedback.save();

        res.status(200).json({
          success: true,

          message:
            "Management response saved. Feedback forwarded to Director.",

          studentId,

          previousDepartment:
            "management",

          department:
            "management",

          nextDepartment:
            "director",

          status:
            feedback.status,

          resolution:
            cleanActionPlan,

          feedback,
        });

        return;
      }

      // ======================================================
      // DIRECTOR → WARDEN
      // ======================================================

      if (
        department ===
          "director" &&
        nextDepartment ===
          "warden"
      ) {
        feedback.assignedDepartment =
          "warden";

        feedback.status =
          "PENDING";

        feedback.assignedAt =
          new Date();

        feedback.resolvedAt =
          null;

        feedback.escalatedAt =
          null;

        feedback.escalationReason =
          "";

        feedback.updatedBy =
          actorId;

        feedback.updatedByRole =
          actorRole;

        await feedback.save();

        res.status(200).json({
          success: true,

          message:
            "Director response saved. Feedback forwarded to Warden.",

          studentId,

          previousDepartment:
            "director",

          department:
            "director",

          nextDepartment:
            "warden",

          status:
            feedback.status,

          resolution:
            cleanActionPlan,

          feedback,
        });

        return;
      }

      // ======================================================
      // WARDEN → FINAL
      // ======================================================

      if (
        department ===
        "warden"
      ) {
        feedback.assignedDepartment =
          "warden";

        feedback.status =
          "RESOLVED";

        feedback.resolvedAt =
          new Date();

        feedback.assignedAt =
          feedback.assignedAt ||
          new Date();

        feedback.updatedBy =
          actorId;

        feedback.updatedByRole =
          actorRole;

        feedback.escalatedAt =
          null;

        feedback.escalationReason =
          "";

        await feedback.save();

        res.status(200).json({
          success: true,

          message:
            "Warden response saved. Feedback resolved successfully.",

          studentId,

          previousDepartment:
            "warden",

          department:
            "warden",

          nextDepartment:
            null,

          status:
            feedback.status,

          resolution:
            cleanActionPlan,

          resolvedAt:
            feedback.resolvedAt,

          feedback,
        });

        return;
      }

      // ======================================================
      // FALLBACK
      // ======================================================

      await feedback.save();

      res.status(200).json({
        success: true,

        message:
          "Feedback updated successfully.",

        studentId,

        department,

        status:
          feedback.status,

        feedback,
      });
    } catch (error: any) {
      console.error(
        "resolveDepartmentFeedback error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Failed to resolve feedback.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error?.message
            : undefined,
      });
    }
  };

// ============================================================
// 6. GET COMPLETE STUDENT WORKFLOW
// ============================================================

export const getStudentDepartmentWorkflow =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        studentId,
      } = req.params;

      if (!studentId) {
        res.status(400).json({
          success: false,
          message:
            "Student ID is required.",
        });

        return;
      }

      const feedback =
        await DepartmentFeedback.findOne({
          studentId,
        }).lean();

      if (!feedback) {
        res.status(404).json({
          success: false,
          message:
            "Feedback not found.",
        });

        return;
      }

      // ======================================================
      // DEPARTMENT STATUS
      // ======================================================

      const managementResolved =
        Boolean(
          String(
            feedback.managementActionPlan ||
              ""
          ).trim()
        );

      const directorResolved =
        Boolean(
          String(
            feedback.directorActionPlan ||
              ""
          ).trim()
        );

      const wardenResolved =
        Boolean(
          String(
            feedback.wardenActionPlan ||
              ""
          ).trim()
        );

      const headResolved =
        Boolean(
          String(
            feedback.headActionPlan ||
              ""
          ).trim()
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      res.json({
        success: true,

        studentId,

        currentDepartment:
          feedback.assignedDepartment ||
          null,

        currentStatus:
          feedback.status,

        finalResolved:
          feedback.status ===
          "RESOLVED",

        complaint: {
          studentId:
            feedback.studentId,

          studentName:
            feedback.studentName,

          classId:
            feedback.classId,

          className:
            feedback.className,

          section:
            feedback.section,

          mentorActionPlan:
            feedback.mentorActionPlan ||
            "",
        },

        departments: {
          management: {
            department:
              "management",

            label:
              "Management",

            status:
              managementResolved
                ? "RESOLVED"
                : "PENDING",

            actionPlan:
              feedback.managementActionPlan ||
              "",
          },

          director: {
            department:
              "director",

            label:
              "Director",

            status:
              directorResolved
                ? "RESOLVED"
                : "PENDING",

            actionPlan:
              feedback.directorActionPlan ||
              "",
          },

          warden: {
            department:
              "warden",

            label:
              "Warden",

            status:
              wardenResolved
                ? "RESOLVED"
                : "PENDING",

            actionPlan:
              feedback.wardenActionPlan ||
              "",
          },

          head: {
            department:
              "head",

            label:
              "Head",

            status:
              headResolved
                ? "RESOLVED"
                : "PENDING",

            actionPlan:
              feedback.headActionPlan ||
              "",
          },
        },

        feedback,
      });
    } catch (error) {
      console.error(
        "getStudentDepartmentWorkflow error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch department workflow.",
      });
    }
  };