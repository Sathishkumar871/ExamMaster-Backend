import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {

  // Head only
  teacherId?: string;

  name: string;

  email: string;

  mobile: string;

  accessCode: string;

  role:
    | "mentor"
    | "manager"
    | "head";

  classId?: string;

  className?: string;

  section?: string;

  subject?: string;

  department?: string;

  viewPermissions: string[];

  updatePermissions: string[];

  isApproved: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {

    // Head Teacher ID
    teacherId: {
      type: String,
      unique: true,
      sparse: true
    },

    // Name
    name: {
      type: String,
      required: true,
      trim: true
    },

    // Email
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    // Mobile
    mobile: {
      type: String,
      required: true,
      trim: true
    },

    // Head Access Code
    accessCode: {
      type: String,
      required: true,
      unique: true
    },

    // Role
    role: {
      type: String,
      enum: ["mentor", "manager", "head"],
      required: true
    },

    classId: {
      type: String
    },

    className: {
      type: String
    },

    section: {
      type: String
    },

    subject: {
      type: String
    },

    department: {
      type: String
    },

    viewPermissions: {
      type: [String],
      default: []
    },

    updatePermissions: {
      type: [String],
      default: []
    },

    // Head Approval
    isApproved: {
      type: Boolean,
      default: false
    }

  },
  {
    timestamps: true
  }
);

export default mongoose.model<IStaff>(
  "Staff",
  staffSchema
);