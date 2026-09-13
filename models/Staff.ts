
import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// STAFF HISTORY
// ============================================================

export type StaffHistoryAction =
  | "ACCEPTED"
  | "REJECTED"
  | "DEACTIVATED"
  | "REACTIVATED"
  | "DELETED"
  | "TRANSFERRED";

// ============================================================
// STAFF HISTORY INTERFACE
// ============================================================

export interface IStaffHistory {
  action: StaffHistoryAction;

  reason?: string;

  // Who performed this action
  performedBy?: string;
  performedByRole?: string;

  // ==========================================================
  // REPLACEMENT MENTOR
  // ==========================================================

  replacementMentorId?: string;
  replacementMentorName?: string;

  // ==========================================================
  // SECTION TRANSFER
  // ==========================================================

  oldSection?: string;
  newSection?: string;

  // ==========================================================
  // STUDENT TRANSFER
  // ==========================================================

  transferredStudentCount?: number;

  transferredStudentIds?: string[];

  createdAt: Date;
}

// ============================================================
// STAFF INTERFACE
// ============================================================

export interface IStaff extends Document {
  // ==========================================================
  // HEAD ONLY
  // ==========================================================

  teacherId?: string;

  // ==========================================================
  // MENTOR ONLY
  // ==========================================================

  mentorId?: string;

  // ==========================================================
  // BASIC INFORMATION
  // ==========================================================

  name: string;

  email: string;

  mobile: string;

  // Password is optional so approval/status updates
  // do not fail when password is not modified.
  password?: string;

  accessCode?: string;

  // ==========================================================
  // ROLE
  // ==========================================================

  role:
    | "mentor"
    | "manager"
    | "head";

  // ==========================================================
  // ACADEMIC ASSIGNMENT
  // ==========================================================

  classId?: string;

  className?: string;

  section?: string;

  subject?: string;

  department?: string;

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  viewPermissions: string[];

  updatePermissions: string[];

  // ==========================================================
  // APPROVAL
  // ==========================================================

  isApproved: boolean;

  // ==========================================================
  // ACCOUNT STATUS
  // ==========================================================

  status:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED"
    | "DELETED";

  // ==========================================================
  // LOGIN / ACCESS
  // ==========================================================

  lastLoginAt?: Date;

  sessionsRevokedAt?: Date;

  // ==========================================================
  // REPLACEMENT INFORMATION
  // ==========================================================

  replacedByMentorId?: string;

  replacedByMentorName?: string;

  replacedAt?: Date;

  // ==========================================================
  // STAFF HISTORY
  // ==========================================================

  history: IStaffHistory[];

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  createdAt: Date;

  updatedAt: Date;
}

// ============================================================
// STAFF HISTORY SCHEMA
// ============================================================

const staffHistorySchema =
  new Schema<IStaffHistory>(
    {
      // ======================================================
      // ACTION
      // ======================================================

      action: {
        type: String,
        enum: [
          "ACCEPTED",
          "REJECTED",
          "DEACTIVATED",
          "REACTIVATED",
          "DELETED",
          "TRANSFERRED",
        ],
        required: true,
      },

      // ======================================================
      // REASON
      // ======================================================

      reason: {
        type: String,
        trim: true,
      },

      // ======================================================
      // PERFORMED BY
      // ======================================================

      performedBy: {
        type: String,
        trim: true,
      },

      performedByRole: {
        type: String,
        trim: true,
        lowercase: true,
      },

      // ======================================================
      // REPLACEMENT MENTOR
      // ======================================================

      replacementMentorId: {
        type: String,
        trim: true,
        uppercase: true,
      },

      replacementMentorName: {
        type: String,
        trim: true,
      },

      // ======================================================
      // SECTION
      // ======================================================

      oldSection: {
        type: String,
        trim: true,
        uppercase: true,
      },

      newSection: {
        type: String,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // STUDENT TRANSFER
      // ======================================================

      transferredStudentCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      transferredStudentIds: {
        type: [String],
        default: [],
      },

      // ======================================================
      // HISTORY DATE
      // ======================================================

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
      versionKey: false,
    }
  );

// ============================================================
// STAFF SCHEMA
// ============================================================

const staffSchema =
  new Schema<IStaff>(
    {
      // ======================================================
      // HEAD TEACHER ID
      // ======================================================

      teacherId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // MENTOR ID
      // ======================================================

      mentorId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // NAME
      // ======================================================

      name: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // EMAIL
      // ======================================================

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      // ======================================================
      // MOBILE
      // ======================================================

      mobile: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // PASSWORD
      // ======================================================

      password: {
        type: String,
        required: false,
        minlength: 6,
      },

      // ======================================================
      // ACCESS CODE
      // ======================================================

      accessCode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
      },

      // ======================================================
      // ROLE
      // ======================================================

      role: {
        type: String,
        enum: [
          "mentor",
          "manager",
          "head",
        ],
        required: true,
      },

      // ======================================================
      // CLASS
      // ======================================================

      classId: {
        type: String,
        trim: true,
      },

      className: {
        type: String,
        trim: true,
      },

      // ======================================================
      // SECTION
      // ======================================================

      section: {
        type: String,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // SUBJECT
      // ======================================================

      subject: {
        type: String,
        trim: true,
      },

      // ======================================================
      // DEPARTMENT
      // ======================================================

      department: {
        type: String,
        trim: true,
      },

      // ======================================================
      // VIEW PERMISSIONS
      // ======================================================

      viewPermissions: {
        type: [String],
        default: [],
      },

      // ======================================================
      // UPDATE PERMISSIONS
      // ======================================================

      updatePermissions: {
        type: [String],
        default: [],
      },

      // ======================================================
      // HEAD APPROVAL
      // ======================================================

      isApproved: {
        type: Boolean,
        default: false,
      },

      // ======================================================
      // ACCOUNT STATUS
      // ======================================================

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "INACTIVE",
          "SUSPENDED",
          "DELETED",
        ],
        default: "INACTIVE",
      },

      // ======================================================
      // LAST LOGIN
      // ======================================================

      lastLoginAt: {
        type: Date,
      },

      // ======================================================
      // SESSION REVOCATION
      // ======================================================

      sessionsRevokedAt: {
        type: Date,
      },

      // ======================================================
      // REPLACEMENT MENTOR
      // ======================================================

      replacedByMentorId: {
        type: String,
        trim: true,
        uppercase: true,
      },

      replacedByMentorName: {
        type: String,
        trim: true,
      },

      replacedAt: {
        type: Date,
      },

      // ======================================================
      // STAFF HISTORY
      // ======================================================

      history: {
        type: [staffHistorySchema],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

// ============================================================
// INDEXES
// ============================================================

staffSchema.index({
  role: 1,
  status: 1,
});

staffSchema.index({
  isApproved: 1,
  role: 1,
});

staffSchema.index({
  "history.action": 1,
});

// ============================================================
// AVOID OVERWRITEMODELERROR
// ============================================================

const Staff =
  mongoose.models.Staff ||
  mongoose.model<IStaff>(
    "Staff",
    staffSchema
  );

export default Staff;

