
import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion extends Document {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;

  chapter?: string;

  subject: string;
  teacherId: string;

  pdfId: string;
  pdfSourceUrl: string;

  status: "pending" | "completed" | "published";

  isAnswerCompleted: boolean;

  examTags: string[];

  isPublished: boolean;

  // =========================================
  // TEST CATEGORY
  // =========================================
  testCategory: "mock" | "daily" | "subject";

  // =========================================
  // EXAM
  // =========================================
  examType: "NEET" | "JEE";

  // =========================================
  // YEAR / CLASS
  // =========================================
  academicYear: "1st PUC" | "2nd PUC";

  // =========================================
  // TEST TITLE
  // =========================================
  testTitle: string;

  // =========================================
  // TEST ID
  // =========================================
  testId: string;

  // =========================================
  // TOTAL QUESTIONS
  // =========================================
  totalQuestions: number;

  // =========================================
  // SCHEDULE
  // =========================================
  testDate?: string;
  testTime?: string;

  // =========================================
  // OPTIONAL
  // =========================================
  targetExamLevel?: string;
  imageUrl?: string;
}

const QuestionSchema: Schema = new Schema(
  {
    // =========================================
    // QUESTION NUMBER
    // =========================================

    questionNumber: {
      type: Number,
      required: true,
    },

    // =========================================
    // QUESTION
    // =========================================

    question: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================================
    // OPTIONS
    // =========================================

    options: {
      type: [String],
      required: true,

      validate: {
        validator: (arr: string[]) =>
          Array.isArray(arr) && arr.length === 4,

        message:
          "Question must contain exactly 4 options.",
      },
    },

    // =========================================
    // ANSWER
    // =========================================

    correctAnswer: {
      type: String,
      default: "",
      trim: true,
    },

    ansNumber: {
      type: String,
      default: "",
    },

    // =========================================
    // QUESTION TYPE
    // =========================================

    questionType: {
      type: String,
      default: "MCQ",
    },

    // =========================================
    // CHAPTER
    // =========================================

    chapter: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================
    // SUBJECT
    // =========================================

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================================
    // TEACHER
    // =========================================

    teacherId: {
      type: String,
      default: "HEAD",
    },

    // =========================================
    // PDF
    // =========================================

    pdfId: {
      type: String,
      default: "manual",
    },

    pdfSourceUrl: {
      type: String,
      default: "",
    },

    // =========================================
    // STATUS
    // =========================================

    status: {
      type: String,

      enum: [
        "pending",
        "completed",
        "published",
      ],

      default: "pending",
    },

    // =========================================
    // ANSWER COMPLETED
    // =========================================

    isAnswerCompleted: {
      type: Boolean,
      default: false,
    },

    // =========================================
    // EXAM TAGS
    // =========================================

    examTags: {
      type: [String],
      default: [],
    },

    // =========================================
    // PUBLISHED
    // =========================================

    isPublished: {
      type: Boolean,
      default: false,
    },

    // =========================================
    // TEST CATEGORY
    // =========================================

    testCategory: {
      type: String,

      enum: [
        "mock",
        "daily",
        "subject",
      ],

      required: true,

      default: "subject",
    },

    // =========================================
    // EXAM TYPE
    // =========================================

    examType: {
      type: String,

      enum: [
        "NEET",
        "JEE",
      ],

      required: true,

      default: "NEET",
    },

    // =========================================
    // ACADEMIC YEAR
    // =========================================

    academicYear: {
      type: String,

      enum: [
        "1st PUC",
        "2nd PUC",
      ],

      required: true,

      default: "1st PUC",
    },

    // =========================================
    // TEST TITLE
    // =========================================

    testTitle: {
      type: String,

      required: true,

      trim: true,
    },

    // =========================================
    // TEST ID
    // =========================================
    //
    // IMPORTANT:
    // Do NOT add index:true here.
    // The index is created below using
    // QuestionSchema.index().
    //

    testId: {
      type: String,

      required: true,
    },

    // =========================================
    // TOTAL QUESTIONS
    // =========================================

    totalQuestions: {
      type: Number,

      required: true,

      default: 0,
    },

    // =========================================
    // TEST DATE
    // =========================================

    testDate: {
      type: String,

      default: "",
    },

    // =========================================
    // TEST TIME
    // =========================================

    testTime: {
      type: String,

      default: "",
    },

    // =========================================
    // TARGET EXAM LEVEL
    // =========================================

    targetExamLevel: {
      type: String,

      default: "board",
    },

    // =========================================
    // IMAGE
    // =========================================

    imageUrl: {
      type: String,

      default: "",
    },
  },

  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Find all questions belonging to one test
QuestionSchema.index({
  testId: 1,
});

// Find tests by category
QuestionSchema.index({
  testCategory: 1,
});

// Find tests by NEET/JEE + year
QuestionSchema.index({
  examType: 1,
  academicYear: 1,
});

// Find subject questions
QuestionSchema.index({
  testCategory: 1,
  subject: 1,
});

// Find exact test questions
QuestionSchema.index({
  testId: 1,
  subject: 1,
  questionNumber: 1,
});

// ============================================================
// MODEL
// ============================================================

const QuestionBank =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestion>(
    "QuestionBank",
    QuestionSchema
  );

export default QuestionBank;

