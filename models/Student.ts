import mongoose, { Schema, Document } from "mongoose";

export interface IStudent extends Document {
  name: string;
  studentId: string;

  email: string;
  emailVerified: boolean;

  mobileNumber: string;

  password: string;

  classId: string;
  className: string;
  academicYear: string;
  section: string;

  // =====================================
  // ACTIVE DEVICE SESSION
  // Only one device can be active
  // =====================================
  activeDeviceId?: string | null;

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
    // =====================================
    // STUDENT NAME
    // =====================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================
    // STUDENT ID
    // =====================================
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =====================================
    // EMAIL
    // =====================================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // =====================================
    // EMAIL VERIFIED
    // =====================================
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // =====================================
    // MOBILE NUMBER
    // =====================================
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =====================================
    // PASSWORD
    // =====================================
    password: {
      type: String,
      required: true,
    },

    // =====================================
    // CLASS ID
    // =====================================
    classId: {
      type: String,
      required: true,
    },

    // =====================================
    // CLASS NAME
    // =====================================
    className: {
      type: String,
      required: true,
    },

    // =====================================
    // ACADEMIC YEAR
    // =====================================
    academicYear: {
      type: String,
      required: true,
    },

    // =====================================
    // SECTION
    // =====================================
    section: {
      type: String,
      required: true,
    },

    // =====================================
    // ACTIVE DEVICE ID
    // =====================================
    // Only the latest logged-in device
    // remains active for this student.
    // =====================================
    activeDeviceId: {
      type: String,
      default: null,
      index: true,
    },

    // =====================================
    // EXAMS ATTEMPTED
    // =====================================
    examsAttempted: {
      type: Number,
      default: 0,
    },

    // =====================================
    // TOTAL MARKS
    // =====================================
    totalMarks: {
      type: Number,
      default: 0,
    },

    // =====================================
    // RATING
    // =====================================
    rating: {
      type: Number,
      default: 0,
    },

    // =====================================
    // WEEKLY UPDATES
    // =====================================
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

export default mongoose.model<IStudent>(
  "Student",
  StudentSchema
);