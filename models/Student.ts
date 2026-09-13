
import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IStudent extends Document {
  // ==========================================================
  // BASIC STUDENT DETAILS
  // ==========================================================

  name: string;
  studentId: string;

  email: string;

  mobileNumber: string;

  password: string;

  // ==========================================================
  // ACADEMIC DETAILS
  // ==========================================================

  classId: string;
  className: string;
  academicYear: string;
  section: string;

  // ==========================================================
  // CURRENT MENTOR
  // ==========================================================

  // Staff MongoDB _id of current mentor
  mentorId?: string;

  // Current mentor's mentorId/code
  mentorCode?: string;

  // Current mentor name
  mentorName?: string;

  // When current mentor was assigned
  mentorAssignedAt?: Date;

  // ==========================================================
  // PREVIOUS MENTOR / SECTION
  // Used for transfer history
  // ==========================================================

  previousMentorId?: string;

  previousMentorName?: string;

  previousSection?: string;

  // ==========================================================
  // ACTIVE DEVICE SESSION
  // Only one device can be active
  // ==========================================================

  activeDeviceId?: string | null;

  // ==========================================================
  // PERFORMANCE
  // ==========================================================

  examsAttempted: number;

  totalMarks: number;

  rating: number;

  // ==========================================================
  // WEEKLY UPDATES
  // ==========================================================

  weeklyUpdates: {
    healthAndWellbeing: string;
    foodAndMaturation: string;
    hostel: string;
    academics: string;
    mentorActionPlan: string;
    updatedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const StudentSchema =
  new Schema<IStudent>(
    {
      // ======================================================
      // STUDENT NAME
      // ======================================================

      name: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // STUDENT ID
      // ======================================================

      studentId: {
        type: String,
        required: true,
        unique: true,
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
      // MOBILE NUMBER
      // ======================================================

      mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      // ======================================================
      // PASSWORD
      // ======================================================

      password: {
        type: String,
        required: true,
      },

      // ======================================================
      // CLASS ID
      // ======================================================

      classId: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // CLASS NAME
      // ======================================================

      className: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // ACADEMIC YEAR
      // ======================================================

      academicYear: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // SECTION
      // ======================================================

      section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // CURRENT MENTOR
      // ======================================================

      mentorId: {
        type: String,
        trim: true,
      },

      mentorCode: {
        type: String,
        trim: true,
        uppercase: true,
      },

      mentorName: {
        type: String,
        trim: true,
      },

      mentorAssignedAt: {
        type: Date,
      },

      // ======================================================
      // PREVIOUS MENTOR
      // ======================================================

      previousMentorId: {
        type: String,
        trim: true,
      },

      previousMentorName: {
        type: String,
        trim: true,
      },

      previousSection: {
        type: String,
        trim: true,
        uppercase: true,
      },

      // ======================================================
      // ACTIVE DEVICE ID
      // ======================================================

      activeDeviceId: {
        type: String,
        default: null,
        index: true,
      },

      // ======================================================
      // EXAMS ATTEMPTED
      // ======================================================

      examsAttempted: {
        type: Number,
        default: 0,
      },

      // ======================================================
      // TOTAL MARKS
      // ======================================================

      totalMarks: {
        type: Number,
        default: 0,
      },

      // ======================================================
      // RATING
      // ======================================================

      rating: {
        type: Number,
        default: 0,
      },

      // ======================================================
      // WEEKLY UPDATES
      // ======================================================

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

// ============================================================
// INDEXES
// ============================================================

StudentSchema.index({
  mentorId: 1,
});

StudentSchema.index({
  mentorCode: 1,
});

StudentSchema.index({
  section: 1,
});

StudentSchema.index({
  className: 1,
  section: 1,
});

// ============================================================
// MODEL
// ============================================================

const Student =
  mongoose.models.Student ||
  mongoose.model<IStudent>(
    "Student",
    StudentSchema
  );

export default Student;

