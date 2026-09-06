import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// TYPES
// ============================================================

export type AssignedDepartment =
  | "management"
  | "director"
  | "warden"
  | "head";

export type FeedbackSourceType =
  | "mentor"
  | "student"
  | "manager"
  | "director"
  | "warden";

export type UpdatedByRole =
  | "mentor"
  | "student"
  | "manager"
  | "director"
  | "head"
  | "warden";

export type FeedbackStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "ESCALATED";

// ============================================================
// INTERFACE
// ============================================================

export interface IDepartmentFeedback
  extends Document {

  // ==========================================================
  // STUDENT DETAILS
  // ==========================================================

  studentId: string;

  studentName: string;

  classId: string;

  className: string;

  section: string;

  // ==========================================================
  // MENTOR ACADEMIC EVALUATION
  // ==========================================================

  mentorEvaluation?: {
    attendance: number;

    subjectUnderstanding: number;

    examPerformance: number;

    homeworkCompletion: number;

    learningInterest: number;

    averageRating: number;
  };

  // ==========================================================
  // MENTOR ACTION PLAN
  // ==========================================================

  mentorActionPlan?: string;

  // ==========================================================
  // ORIGINAL DEPARTMENT
  // ==========================================================

  originalDepartment?: AssignedDepartment;

  // ==========================================================
  // CURRENT DEPARTMENT
  // ==========================================================

  assignedDepartment?: AssignedDepartment;

  // ==========================================================
  // WORKFLOW STATUS
  // ==========================================================

  status: FeedbackStatus;

  // ==========================================================
  // ASSIGNED DATE
  // ==========================================================

  assignedAt?: Date;

  // ==========================================================
  // RESOLVED DATE
  // ==========================================================

  resolvedAt?: Date | null;

  // ==========================================================
  // ESCALATED DATE
  // ==========================================================

  escalatedAt?: Date | null;

  // ==========================================================
  // ESCALATION REASON
  // ==========================================================

  escalationReason?: string;

  // ==========================================================
  // HEALTH
  // ==========================================================

  health?: {
    status: string;
    fitness: string;
    sleep: string;
    stress: string;
    medicalRequired: boolean;
    notes: string;
  };

  // ==========================================================
  // FOOD
  // ==========================================================

  food?: {
    satisfaction: string;
    mealPattern: string;
    waterIntake: string;
    nutritionQuality: string;
    concerns: string[];
    feedback: string;
  };

  // ==========================================================
  // HOSTEL
  // ==========================================================

  hostel?: {
    hostelAdjustment: string;
    roomEnvironment: string;
    roommateRelationship: string;
    cleanliness: string;
    food: string;
    water: string;
    bathroom: string;
    safety: string;
    studyEnvironment: string;
    complaints: string[];
    mentorRemarks: string;
  };

  // ==========================================================
  // BEHAVIOR
  // ==========================================================

  behavior?: {
    discipline: string;
    respectToFaculty: string;
    respectToStudents: string;
    communication: string;
    leadership: string;
    teamWork: string;
    attendance: string;
    punctuality: string;
    classParticipation: string;
    mobileUsage: string;
    mentorRemarks: string;
  };

  // ==========================================================
  // ACADEMIC
  // ==========================================================

  academic?: {
    overallPerformance: string;
    attendancePercentage: string;
    assignmentCompletion: string;
    homeworkCompletion: string;
    classParticipation: string;
    weakSubjects: string[];
    strongSubjects: string[];
    learningAbility: string;
    examPreparation: string;
    concentrationLevel: string;
    mentorSuggestions: string;
  };

  // ==========================================================
  // MANAGEMENT ACTION PLAN
  // ==========================================================

  managementActionPlan?: string;

  // ==========================================================
  // DIRECTOR ACTION PLAN
  // ==========================================================

  directorActionPlan?: string;

  // ==========================================================
  // WARDEN ACTION PLAN
  // ==========================================================

  wardenActionPlan?: string;

  // ==========================================================
  // HEAD ACTION PLAN
  // ==========================================================

  headActionPlan?: string;

  // ==========================================================
  // SOURCE / AUDIT
  // ==========================================================

  sourceType: FeedbackSourceType;

  updatedBy: string;

  updatedByRole: UpdatedByRole;

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  createdAt: Date;

  updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const DepartmentFeedbackSchema =
  new Schema<IDepartmentFeedback>(
    {
      // ========================================================
      // STUDENT DETAILS
      // ========================================================

      studentId: {
        type: String,
        required: true,
        trim: true,
      },

      studentName: {
        type: String,
        required: true,
        trim: true,
      },

      classId: {
        type: String,
        required: true,
        trim: true,
      },

      className: {
        type: String,
        required: true,
        trim: true,
      },

      section: {
        type: String,
        required: true,
        trim: true,
      },

      // ========================================================
      // MENTOR EVALUATION
      // ========================================================

      mentorEvaluation: {
        attendance: {
          type: Number,
          min: 1,
          max: 5,
        },

        subjectUnderstanding: {
          type: Number,
          min: 1,
          max: 5,
        },

        examPerformance: {
          type: Number,
          min: 1,
          max: 5,
        },

        homeworkCompletion: {
          type: Number,
          min: 1,
          max: 5,
        },

        learningInterest: {
          type: Number,
          min: 1,
          max: 5,
        },

        averageRating: {
          type: Number,
          min: 0,
          max: 5,
        },
      },

      // ========================================================
      // MENTOR ACTION PLAN
      // ========================================================

      mentorActionPlan: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // ORIGINAL DEPARTMENT
      // ========================================================

      originalDepartment: {
        type: String,

        enum: [
          "management",
          "director",
          "warden",
          "head",
        ],

        default: undefined,

        index: true,
      },

      // ========================================================
      // CURRENT DEPARTMENT
      // ========================================================

      assignedDepartment: {
        type: String,

        enum: [
          "management",
          "director",
          "warden",
          "head",
        ],

        default: undefined,

        index: true,
      },

      // ========================================================
      // WORKFLOW STATUS
      // ========================================================

      status: {
        type: String,

        enum: [
          "PENDING",
          "IN_PROGRESS",
          "RESOLVED",
          "ESCALATED",
        ],

        default: "PENDING",

        index: true,
      },

      // ========================================================
      // ASSIGNED DATE
      // ========================================================

      assignedAt: {
        type: Date,
        default: null,
      },

      // ========================================================
      // RESOLVED DATE
      // ========================================================

      resolvedAt: {
        type: Date,
        default: null,
      },

      // ========================================================
      // ESCALATED DATE
      // ========================================================

      escalatedAt: {
        type: Date,
        default: null,
      },

      // ========================================================
      // ESCALATION REASON
      // ========================================================

      escalationReason: {
        type: String,
        default: "",
        trim: true,
      },

      // ========================================================
      // HEALTH
      // ========================================================

      health: {
        status: String,
        fitness: String,
        sleep: String,
        stress: String,
        medicalRequired: Boolean,
        notes: String,
      },

      // ========================================================
      // FOOD
      // ========================================================

      food: {
        satisfaction: String,
        mealPattern: String,
        waterIntake: String,
        nutritionQuality: String,
        concerns: [String],
        feedback: String,
      },

      // ========================================================
      // HOSTEL
      // ========================================================

      hostel: {
        hostelAdjustment: String,
        roomEnvironment: String,
        roommateRelationship: String,
        cleanliness: String,
        food: String,
        water: String,
        bathroom: String,
        safety: String,
        studyEnvironment: String,
        complaints: [String],
        mentorRemarks: String,
      },

      // ========================================================
      // BEHAVIOR
      // ========================================================

      behavior: {
        discipline: String,
        respectToFaculty: String,
        respectToStudents: String,
        communication: String,
        leadership: String,
        teamWork: String,
        attendance: String,
        punctuality: String,
        classParticipation: String,
        mobileUsage: String,
        mentorRemarks: String,
      },

      // ========================================================
      // ACADEMIC
      // ========================================================

      academic: {
        overallPerformance: String,
        attendancePercentage: String,
        assignmentCompletion: String,
        homeworkCompletion: String,
        classParticipation: String,
        weakSubjects: [String],
        strongSubjects: [String],
        learningAbility: String,
        examPreparation: String,
        concentrationLevel: String,
        mentorSuggestions: String,
      },

      // ========================================================
      // MANAGEMENT ACTION PLAN
      // ========================================================

      managementActionPlan: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // DIRECTOR ACTION PLAN
      // ========================================================

      directorActionPlan: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // WARDEN ACTION PLAN
      // ========================================================

      wardenActionPlan: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // HEAD ACTION PLAN
      // ========================================================

      headActionPlan: {
        type: String,
        trim: true,
        default: "",
      },

      // ========================================================
      // SOURCE TYPE
      // ========================================================

      sourceType: {
        type: String,

        enum: [
          "mentor",
          "student",
          "manager",
          "director",
          "warden",
        ],

        required: true,
      },

      // ========================================================
      // UPDATED BY
      // ========================================================

      updatedBy: {
        type: String,
        required: true,
        trim: true,
      },

      // ========================================================
      // UPDATED BY ROLE
      // ========================================================

      updatedByRole: {
        type: String,

        enum: [
          "mentor",
          "student",
          "manager",
          "director",
          "head",
          "warden",
        ],

        required: true,
      },
    },

    {
      timestamps: true,
    }
  );

// ============================================================
// ONE STUDENT = ONE DOCUMENT
// ============================================================

DepartmentFeedbackSchema.index(
  { studentId: 1 },
  { unique: true }
);

// ============================================================
// DEPARTMENT + STATUS FILTER
// ============================================================

DepartmentFeedbackSchema.index({
  assignedDepartment: 1,
  status: 1,
});

// ============================================================
// ESCALATION QUERY
// ============================================================

DepartmentFeedbackSchema.index({
  assignedDepartment: 1,
  status: 1,
  assignedAt: 1,
});

// ============================================================
// MODEL
// ============================================================

export default mongoose.model<IDepartmentFeedback>(
  "DepartmentFeedback",
  DepartmentFeedbackSchema
);