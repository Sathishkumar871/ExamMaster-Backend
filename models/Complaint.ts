
import mongoose, {
  Schema,
  Document,
} from "mongoose";


// ============================================================
// COMPLAINT INTERFACE
// ============================================================

export interface IComplaint
  extends Document {

  studentId: string;

  studentName: string;

  className: string;

  classId: string;

  section: string;

  description: string;

  status:
    | "Pending"
    | "Resolved";

  // ==========================================================
  // MANAGEMENT RESPONSE
  // ==========================================================

  managementReply?: string;

  repliedBy?: string;

  repliedAt?: Date;

  // ==========================================================
  // RESOLVED
  // ==========================================================

  resolvedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}


// ============================================================
// SCHEMA
// ============================================================

const complaintSchema =
  new Schema<IComplaint>(
    {

      // ======================================================
      // STUDENT
      // ======================================================

      studentId: {
        type: String,
        required: true,
        index: true,
      },

      studentName: {
        type: String,
        required: true,
      },

      className: {
        type: String,
        default: "N/A",
      },

      classId: {
        type: String,
        default: "N/A",
      },

      section: {
        type: String,
        default: "N/A",
        index: true,
      },


      // ======================================================
      // COMPLAINT
      // ======================================================

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
      },


      // ======================================================
      // STATUS
      // ======================================================

      status: {
        type: String,

        enum: [
          "Pending",
          "Resolved",
        ],

        default: "Pending",

        index: true,
      },


      // ======================================================
      // MANAGEMENT RESPONSE
      // ======================================================

      managementReply: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      repliedBy: {
        type: String,
        default: "",
        trim: true,
      },

      repliedAt: {
        type: Date,
        default: null,
      },


      // ======================================================
      // RESOLVED DATE
      // ======================================================

      resolvedAt: {
        type: Date,
        default: null,
      },

    },

    {
      timestamps: true,
    }
  );


// ============================================================
// PREVENT MODEL OVERWRITE
// ============================================================

const Complaint =
  mongoose.models.Complaint ||
  mongoose.model<IComplaint>(
    "Complaint",
    complaintSchema
  );

export default Complaint;

