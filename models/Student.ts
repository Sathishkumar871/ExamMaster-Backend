import mongoose, { Schema, Document } from "mongoose";

export interface IStudent extends Document {
  name: string;
  studentId: string;
  email: string;
  password: string;

  // Class Details
  classId: string;
  className: string;
  academicYear: string; 
  section: string;

  examsAttempted: number;
  totalMarks: number;
  rating: number;

  weeklyUpdates: {
    healthAndWellbeing: string;
    foodAndMaturation: string;
    hostel: string;
    academics: string;
    mentorActionPlan: string;
    updatedAt?: Date;
  };
}

const StudentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: true,
    },

    studentId: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    classId: {
      type: String,
      required: true,
    },

    className: {
      type: String,
      required: true,
    },

    academicYear: { // <--- ఇక్కడ కూడా 'year' కి బదులుగా 'academicYear' ఉండాలి
      type: String,
      required: true,
    },

    section: {
      type: String,
      required: true,
    },

    examsAttempted: {
      type: Number,
      default: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
    },

    weeklyUpdates: {
      healthAndWellbeing: {
        type: String,
        default: "",
      },
      foodAndMaturation: {
        type: String,
        default: "",
      },
      hostel: {
        type: String,
        default: "",
      },
      academics: {
        type: String,
        default: "",
      },
      mentorActionPlan: {
        type: String,
        default: "",
      },
      updatedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStudent>("Student", StudentSchema);