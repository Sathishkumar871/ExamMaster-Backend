import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// RESULT INTERFACE
// ============================================================

export interface IResult extends Document {
  // ============================================================
  // STUDENT
  // ============================================================

  studentId: string;
  studentName: string;

  // ============================================================
  // EXAM
  // ============================================================

  examId?: mongoose.Types.ObjectId | null;
  examName: string;

  // ============================================================
  // TEST CATEGORY
  // ============================================================

  testCategory: "mock" | "daily" | "subject";

  // ============================================================
  // SUBJECT
  // ============================================================

  subject: string;

  // ============================================================
  // QUESTION STATS
  // ============================================================

  totalQuestions: number;
  attemptedQuestions: number;
  unansweredQuestions: number;

  // ============================================================
  // ANSWER STATS
  // ============================================================

  correctAnswers: number;
  wrongAnswers: number;

  // ============================================================
  // MARKS
  // ============================================================

  marks: number;
  percentage: number;
  grade: string;
  status: "PASS" | "FAIL";

  // ============================================================
  // EXAM DETAILS
  // ============================================================

  timeTaken: number;
  warnings: number;
  rank: number;

  // ============================================================
  // RESULT RELEASE
  // ============================================================

  resultAvailableAt: Date;
  isResultPublished: boolean;

  // ============================================================
  // QUESTION REVIEW
  // ============================================================

  review: {
    questionId: mongoose.Types.ObjectId;

    question: string;

    // Question type
    questionType?: "MCQ" | "TABLE" | "DIAGRAM";

    // MCQ options
    options?: string[];

    // Diagram / Image
    imageUrl?: string;
    questionImage?: string;

    // Table
    tableHeaders?: string[];
    tableRows?: string[][];

    // Answers
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;

    // Marks
    marks?: number;

    // Explanation
    explanation?: string;
  }[];
}

// ============================================================
// REVIEW SUB-SCHEMA
// ============================================================

const ReviewSchema = new Schema(
  {
    // ==========================================================
    // QUESTION ID
    // ==========================================================

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionBank",
      required: true,
    },

    // ==========================================================
    // QUESTION
    // ==========================================================

    question: {
      type: String,
      default: "",
    },

    // ==========================================================
    // QUESTION TYPE
    // ==========================================================

    questionType: {
      type: String,
      enum: ["MCQ", "TABLE", "DIAGRAM"],
      default: "MCQ",
    },

    // ==========================================================
    // OPTIONS
    // ==========================================================

    options: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // DIAGRAM / IMAGE
    // ==========================================================

    imageUrl: {
      type: String,
      default: "",
    },

    questionImage: {
      type: String,
      default: "",
    },

    // ==========================================================
    // TABLE
    // ==========================================================

    tableHeaders: {
      type: [String],
      default: [],
    },

    tableRows: {
      type: [[String]],
      default: [],
    },

    // ==========================================================
    // ANSWERS
    // ==========================================================

    selectedAnswer: {
      type: String,
      default: "",
    },

    correctAnswer: {
      type: String,
      default: "",
    },

    isCorrect: {
      type: Boolean,
      default: false,
    },

    // ==========================================================
    // MARKS
    // ==========================================================

    marks: {
      type: Number,
      default: 0,
    },

    // ==========================================================
    // EXPLANATION
    // ==========================================================

    explanation: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

// ============================================================
// RESULT SCHEMA
// ============================================================

const ResultSchema = new Schema<IResult>(
  {
    // ==========================================================
    // STUDENT
    // ==========================================================

    studentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    studentName: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================================
    // EXAM
    // ==========================================================

    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: false,
      default: null,
    },

    examName: {
      type: String,
      default: "Exam",
      trim: true,
    },

    // ==========================================================
    // TEST CATEGORY
    // ==========================================================

    testCategory: {
      type: String,
      enum: ["mock", "daily", "subject"],
      required: true,
      default: "subject",
      index: true,
    },

    // ==========================================================
    // SUBJECT
    // ==========================================================

    subject: {
      type: String,
      required: true,
      trim: true,
      default: "General",
      index: true,
    },

    // ==========================================================
    // QUESTION STATS
    // ==========================================================

    totalQuestions: {
      type: Number,
      required: true,
      min: 0,
    },

    attemptedQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    unansweredQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================================
    // ANSWER STATS
    // ==========================================================

    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    wrongAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================================
    // MARKS
    // ==========================================================

    marks: {
      type: Number,
      default: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    grade: {
      type: String,
      default: "F",
      trim: true,
    },

    status: {
      type: String,
      enum: ["PASS", "FAIL"],
      default: "FAIL",
    },

    // ==========================================================
    // EXAM DETAILS
    // ==========================================================

    timeTaken: {
      type: Number,
      default: 0,
    },

    warnings: {
      type: Number,
      default: 0,
    },

    rank: {
      type: Number,
      default: 0,
    },

    // ==========================================================
    // RESULT RELEASE
    // ==========================================================

    resultAvailableAt: {
      type: Date,
      required: true,
      index: true,
    },

    isResultPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ==========================================================
    // QUESTION REVIEW
    // ==========================================================

    review: {
      type: [ReviewSchema],
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

ResultSchema.index({
  studentId: 1,
  createdAt: -1,
});

ResultSchema.index({
  testCategory: 1,
  resultAvailableAt: 1,
});

ResultSchema.index({
  isResultPublished: 1,
});

ResultSchema.index({
  subject: 1,
});

// ============================================================
// PREVENT OVERWRITE MODEL ERROR
// ============================================================

const Result =
  mongoose.models.Result ||
  mongoose.model<IResult>("Result", ResultSchema);

export default Result;