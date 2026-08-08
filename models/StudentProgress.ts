import mongoose, { Document, Schema } from "mongoose";

export interface IStudentProgress extends Document {
  studentId: string;
  subject: string;
  chapter: string;

  easyCompleted: boolean;
  mediumCompleted: boolean;
  hardCompleted: boolean;

  easyScore: number;
  mediumScore: number;
  hardScore: number;

  totalAttempts: number;
}

const StudentProgressSchema = new Schema<IStudentProgress>(
  {
    studentId: {
      type: String,
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    chapter: {
      type: String,
      required: true,
    },

    easyCompleted: {
      type: Boolean,
      default: false,
    },

    mediumCompleted: {
      type: Boolean,
      default: false,
    },

    hardCompleted: {
      type: Boolean,
      default: false,
    },

    easyScore: {
      type: Number,
      default: 0,
    },

    mediumScore: {
      type: Number,
      default: 0,
    },

    hardScore: {
      type: Number,
      default: 0,
    },

    totalAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStudentProgress>(
  "StudentProgress",
  StudentProgressSchema
);