import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// TYPES
// ============================================================

export type TestCategory =
  | "mock"
  | "daily"
  | "subject";

export type ExamType =
  | "NEET"
  | "JEE";

export type AcademicYear =
  | "1st PUC"
  | "2nd PUC";

// Mock/Daily tests can have empty subject.
// Subject tests should use physics/chemistry/botany/zoology.
export type QuestionSubject =
  | ""
  | "physics"
  | "chemistry"
  | "botany"
  | "zoology";

export type QuestionStatus =
  | "pending"
  | "completed"
  | "published";

// ============================================================
// INTERFACE
// ============================================================

export interface IQuestion extends Document {

  // ==========================================================
  // QUESTION
  // ==========================================================

  questionNumber: number;

  subjectQuestionNumber: number;

  globalQuestionNumber: number;

  question: string;

  options: string[];

  correctAnswer: string;

  ansNumber: string;

  questionType: string;

  chapter?: string;

  // ==========================================================
  // SUBJECT
  // ==========================================================

  // Subject test:
  // physics / chemistry / botany / zoology
  //
  // Mock test:
  // ""
  subject: QuestionSubject;

  // ==========================================================
  // SUBJECT ORDER
  // ==========================================================

  // Physics   = 1
  // Chemistry = 2
  // Botany    = 3
  // Zoology   = 4
  //
  // Mock test without subject:
  // 0

  subjectOrder: number;

  // ==========================================================
  // TEACHER
  // ==========================================================

  teacherId: string;

  // ==========================================================
  // PDF
  // ==========================================================

  pdfId: string;

  pdfSourceUrl: string;

  // ==========================================================
  // STATUS
  // ==========================================================

  status: QuestionStatus;

  isAnswerCompleted: boolean;

  isPublished: boolean;

  // ==========================================================
  // TAGS
  // ==========================================================

  examTags: string[];

  // ==========================================================
  // TEST CATEGORY
  // ==========================================================

  testCategory: TestCategory;

  // ==========================================================
  // EXAM
  // ==========================================================

  examType: ExamType;

  // ==========================================================
  // ACADEMIC YEAR
  // ==========================================================

  academicYear: AcademicYear;

  // ==========================================================
  // TEST
  // ==========================================================

  testTitle: string;

  testId: string;

  totalQuestions: number;

  // ==========================================================
  // SCHEDULE
  // ==========================================================

  testDate?: string;

  testTime?: string;

  // ==========================================================
  // OPTIONAL
  // ==========================================================

  targetExamLevel?: string;

  imageUrl?: string;
}

// ============================================================
// SCHEMA
// ============================================================

const QuestionSchema =
  new Schema<IQuestion>(
    {

      // ======================================================
      // QUESTION NUMBER
      // ======================================================

      questionNumber: {
        type: Number,
        required: true,
      },

      // ======================================================
      // SUBJECT QUESTION NUMBER
      // ======================================================

      subjectQuestionNumber: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      // ======================================================
      // GLOBAL QUESTION NUMBER
      // ======================================================

      globalQuestionNumber: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      // ======================================================
      // QUESTION
      // ======================================================

      question: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // OPTIONS
      // ======================================================

      options: {
        type: [String],
        required: true,

        validate: {
          validator: (
            arr: string[]
          ) =>
            Array.isArray(arr) &&
            arr.length === 4,

          message:
            "Question must contain exactly 4 options.",
        },
      },

      // ======================================================
      // CORRECT ANSWER
      // ======================================================

      correctAnswer: {
        type: String,
        default: "",
        trim: true,
      },

      // ======================================================
      // ANSWER NUMBER
      // ======================================================

      ansNumber: {
        type: String,
        default: "",
        trim: true,
      },

      // ======================================================
      // QUESTION TYPE
      // ======================================================

      questionType: {
        type: String,
        default: "MCQ",
        trim: true,
      },

      // ======================================================
      // CHAPTER
      // ======================================================

      chapter: {
        type: String,
        default: "",
        trim: true,
      },

      // ======================================================
      // SUBJECT
      // ======================================================
      //
      // Subject Test:
      // physics / chemistry / botany / zoology
      //
      // Mock Test:
      // ""
      //
      // Daily Test:
      // can also be empty if not subject-specific
      // ======================================================

      subject: {
        type: String,

        enum: [
          "",
          "physics",
          "chemistry",
          "botany",
          "zoology",
        ],

        default: "",

        trim: true,
      },

      // ======================================================
      // SUBJECT ORDER
      // ======================================================

      subjectOrder: {
        type: Number,

        required: true,

        default: 0,

        min: 0,

        max: 4,
      },

      // ======================================================
      // TEACHER
      // ======================================================

      teacherId: {
        type: String,

        default: "HEAD",

        trim: true,
      },

      // ======================================================
      // PDF ID
      // ======================================================

      pdfId: {
        type: String,

        default: "manual",

        trim: true,
      },

      // ======================================================
      // PDF SOURCE URL
      // ======================================================

      pdfSourceUrl: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // STATUS
      // ======================================================

      status: {
        type: String,

        enum: [
          "pending",
          "completed",
          "published",
        ],

        default: "pending",
      },

      // ======================================================
      // ANSWER COMPLETED
      // ======================================================

      isAnswerCompleted: {
        type: Boolean,

        default: false,
      },

      // ======================================================
      // EXAM TAGS
      // ======================================================

      examTags: {
        type: [String],

        default: [],
      },

      // ======================================================
      // PUBLISHED
      // ======================================================

      isPublished: {
        type: Boolean,

        default: false,
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

        default: "subject",
      },

      // ======================================================
      // EXAM TYPE
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
      // ACADEMIC YEAR
      // ======================================================

      academicYear: {
        type: String,

        enum: [
          "1st PUC",
          "2nd PUC",
        ],

        required: true,

        default: "1st PUC",
      },

      // ======================================================
      // TEST TITLE
      // ======================================================

      testTitle: {
        type: String,

        required: true,

        trim: true,
      },

      // ======================================================
      // TEST ID
      // ======================================================

      testId: {
        type: String,

        required: true,

        trim: true,

        index: true,
      },

      // ======================================================
      // TOTAL QUESTIONS
      // ======================================================

      totalQuestions: {
        type: Number,

        required: true,

        default: 0,

        min: 0,
      },

      // ======================================================
      // TEST DATE
      // ======================================================

      testDate: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // TEST TIME
      // ======================================================

      testTime: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // TARGET EXAM LEVEL
      // ======================================================

      targetExamLevel: {
        type: String,

        default: "board",

        trim: true,
      },

      // ======================================================
      // IMAGE
      // ======================================================

      imageUrl: {
        type: String,

        default: "",

        trim: true,
      },

    },
    {
      timestamps: true,
    }
  );

// ============================================================
// INDEXES
// ============================================================

// Find questions belonging to one test
QuestionSchema.index({
  testId: 1,
});

// Find tests by category
QuestionSchema.index({
  testCategory: 1,
});

// NEET / JEE + Academic Year
QuestionSchema.index({
  examType: 1,
  academicYear: 1,
});

// Subject questions
QuestionSchema.index({
  testCategory: 1,
  subject: 1,
});

// Exact test + subject order
QuestionSchema.index({
  testId: 1,
  subjectOrder: 1,
  subjectQuestionNumber: 1,
});

// Student test fetching
QuestionSchema.index({
  testId: 1,
  academicYear: 1,
  examType: 1,
});

// Publish schedule
QuestionSchema.index({
  testCategory: 1,
  testDate: 1,
  testTime: 1,
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