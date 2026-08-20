import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// TYPES
// ============================================================

export type ExamType =
  | "NEET"
  | "JEE";

export type TestCategory =
  | "mock"
  | "daily"
  | "subject";

export type ExamStatus =
  | "draft"
  | "published"
  | "completed";

// ============================================================
// EXAM INTERFACE
// ============================================================

export interface IExam extends Document {

  // ==========================================================
  // BASIC INFORMATION
  // ==========================================================

  title: string;

  examName: string;

  subject: string;

  chapter: string;

  className: string;

  // ==========================================================
  // EXAM TYPE
  // ==========================================================

  examType: ExamType;

  targetExam: ExamType;

  // ==========================================================
  // TEST CATEGORY
  // ==========================================================

  testCategory: TestCategory;

  // ==========================================================
  // DURATION
  // ==========================================================

  duration: number;

  // ==========================================================
  // QUESTIONS
  // ==========================================================

  totalQuestions: number;

  questions: mongoose.Types.ObjectId[];

  // ==========================================================
  // MARKING
  // ==========================================================

  marksPerQuestion: number;

  negativeMarks: number;

  // ==========================================================
  // MOCK TEST SCHEDULE
  // ==========================================================

  startDate: Date;

  endDate: Date;

  // ==========================================================
  // RESULT RELEASE
  // ==========================================================

  resultReleaseAt: Date;

  isResultPublished: boolean;

  // ==========================================================
  // CREATED BY
  // ==========================================================

  createdBy: string;

  // ==========================================================
  // STATUS
  // ==========================================================

  status: ExamStatus;

  isPublished: boolean;

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  createdAt: Date;

  updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const ExamSchema =
  new Schema<IExam>(
    {

      // ======================================================
      // TITLE
      // ======================================================

      title: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // EXAM NAME
      // ======================================================

      examName: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // SUBJECT
      // ======================================================

      subject: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // CHAPTER
      // ======================================================

      chapter: {
        type: String,
        default: "All",
        trim: true,
      },

      // ======================================================
      // CLASS
      // ======================================================

      className: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // EXAM TYPE
      // NEET / JEE
      // ======================================================

      examType: {
        type: String,
        enum: [
          "NEET",
          "JEE",
        ],
        required: true,
        default: "NEET",
      },

      // ======================================================
      // TARGET EXAM
      // ======================================================

      targetExam: {
        type: String,
        enum: [
          "NEET",
          "JEE",
        ],
        required: true,
        default: "NEET",
      },

      // ======================================================
      // TEST CATEGORY
      // ======================================================

      testCategory: {
        type: String,
        enum: [
          "mock",
          "daily",
          "subject",
        ],
        required: true,
        default: "mock",
      },

      // ======================================================
      // DURATION
      // Minutes
      // ======================================================

      duration: {
        type: Number,
        required: true,
        default: 180,
        min: 1,
      },

      // ======================================================
      // TOTAL QUESTIONS
      // ======================================================

      totalQuestions: {
        type: Number,
        required: true,
        min: 1,
      },

      // ======================================================
      // QUESTION IDS
      // ======================================================

      questions: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref:
            "QuestionBank",

          required: true,
        },
      ],

      // ======================================================
      // MARKS PER QUESTION
      // ======================================================

      marksPerQuestion: {
        type: Number,
        required: true,
        default: 4,
        min: 0,
      },

      // ======================================================
      // NEGATIVE MARKING
      // ======================================================

      negativeMarks: {
        type: Number,
        required: true,
        default: 1,
        min: 0,
      },

      // ======================================================
      // MOCK TEST START
      // ======================================================

      startDate: {
        type: Date,
        required: true,
      },

      // ======================================================
      // MOCK TEST END
      // ======================================================

      endDate: {
        type: Date,
        required: true,
      },

      // ======================================================
      // RESULT RELEASE
      //
      // Mock result will normally be:
      // NEXT DAY 09:00 AM
      // ======================================================

      resultReleaseAt: {
        type: Date,
        required: true,
      },

      // ======================================================
      // RESULT PUBLISHED
      // ======================================================

      isResultPublished: {
        type: Boolean,
        default: false,
      },

      // ======================================================
      // CREATED BY
      // ======================================================

      createdBy: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // STATUS
      // ======================================================

      status: {
        type: String,

        enum: [
          "draft",
          "published",
          "completed",
        ],

        default: "draft",

        required: true,
      },

      // ======================================================
      // PUBLISHED
      // ======================================================

      isPublished: {
        type: Boolean,
        default: false,
      },
    },

    {
      timestamps: true,
    }
  );

// ============================================================
// INDEXES
// ============================================================

ExamSchema.index({
  createdBy: 1,
});

ExamSchema.index({
  status: 1,
  isPublished: 1,
});

ExamSchema.index({
  testCategory: 1,
});

ExamSchema.index({
  examType: 1,
});

ExamSchema.index({
  targetExam: 1,
});

ExamSchema.index({
  subject: 1,
});

ExamSchema.index({
  testCategory: 1,
  examType: 1,
});

ExamSchema.index({
  testCategory: 1,
  targetExam: 1,
  status: 1,
  isPublished: 1,
});

ExamSchema.index({
  resultReleaseAt: 1,
  isResultPublished: 1,
});

ExamSchema.index({
  startDate: 1,
  endDate: 1,
});

// ============================================================
// MODEL
// ============================================================

const Exam =
  mongoose.models.Exam ||
  mongoose.model<IExam>(
    "Exam",
    ExamSchema
  );

export default Exam;