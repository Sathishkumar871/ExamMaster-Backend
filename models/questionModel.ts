
import mongoose, {
  Schema,
  Document,
  Model,
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
  | "JEE"
  | "";

export type ClassName =
  | "1st PUC"
  | "2nd PUC";

export type QuestionStatus =
  | "pending"
  | "completed"
  | "published";

export type AIStatus =
  | "pending"
  | "correct"
  | "wrong"
  | "not_checked";

export type QuestionType =
  | "MCQ"
  | "TABLE"
  | "DIAGRAM";

export type TargetExamLevel =
  | "board"
  | "NEET"
  | "JEE"
  | "NEET/JEE";

// ============================================================
// AI ISSUE
// ============================================================

export interface IAIQuestionIssue {
  field: string;

  message: string;

  severity:
    | "low"
    | "medium"
    | "high";

  resolved: boolean;
}

// ============================================================
// TABLE DATA TYPES
// ============================================================

export type TableCell = string;

export type TableRow = TableCell[];

export type TableHeaders = string[];

// ============================================================
// QUESTION DOCUMENT
// ============================================================

export interface IQuestionBank
  extends Document {

  // ----------------------------------------------------------
  // QUESTION
  // ----------------------------------------------------------

  questionNumber: number;

  subjectQuestionNumber: number;

  globalQuestionNumber: number;

  question: string;

  options: string[];

  correctAnswer: string;

  ansNumber: string;

  questionType: QuestionType;

  // ----------------------------------------------------------
  // TABLE DATA
  // ----------------------------------------------------------

  tableHeaders: TableHeaders;

  tableRows: TableRow[];

  // ----------------------------------------------------------
  // SUBJECT
  // ----------------------------------------------------------

  subject: string;

  chapter: string;

  subjectOrder: number;

  // ----------------------------------------------------------
  // EXAM
  // ----------------------------------------------------------

  testCategory: TestCategory;

  examType: ExamType;

  className: ClassName;

  testTitle: string;

  testId: string;

  totalQuestions: number;

  // ----------------------------------------------------------
  // MARKING
  // ----------------------------------------------------------

  marksPerQuestion: number;

  negativeMarks: number;

  // ----------------------------------------------------------
  // EXAM TIMING
  // ----------------------------------------------------------

  durationMinutes: number;

  testDate: string;

  testTime: string;

  // ----------------------------------------------------------
  // MOCK TEST SCHEDULE
  // ----------------------------------------------------------
  // Only used for Mock Test.
  //
  // Daily Test  -> null
  // Subject Test -> null
  // Mock Test    -> scheduled Date
  // ----------------------------------------------------------

  publishAt: Date | null;

  // ----------------------------------------------------------
  // OWNER
  // ----------------------------------------------------------

  teacherId: string;

  // ----------------------------------------------------------
  // PDF
  // ----------------------------------------------------------

  pdfId: string;

  pdfSourceUrl: string;

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  status: QuestionStatus;

  isAnswerCompleted: boolean;

  isPublished: boolean;

  // ----------------------------------------------------------
  // EXAM TAGS
  // ----------------------------------------------------------

  examTags: string[];

  targetExamLevel: TargetExamLevel;

  // ----------------------------------------------------------
  // IMAGE / DIAGRAM
  // ----------------------------------------------------------

  imageUrl: string;

  questionImage: string;

  // ----------------------------------------------------------
  // AI
  // ----------------------------------------------------------

  aiGenerated: boolean;

  aiVerified: boolean;

  aiStatus: AIStatus;

  aiIssues: IAIQuestionIssue[];

  aiExplanation: string;

  aiCheckedAt?: Date;

  // ----------------------------------------------------------
  // SOURCE
  // ----------------------------------------------------------

  sourceType:
    | "manual"
    | "pdf"
    | "ai";

  // ----------------------------------------------------------
  // TIMESTAMPS
  // ----------------------------------------------------------

  createdAt: Date;

  updatedAt: Date;
}

// ============================================================
// AI ISSUE SCHEMA
// ============================================================

const aiIssueSchema =
  new Schema<IAIQuestionIssue>(
    {
      field: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      severity: {
        type: String,
        enum: [
          "low",
          "medium",
          "high",
        ],
        default: "medium",
      },

      resolved: {
        type: Boolean,
        default: false,
      },
    },
    {
      _id: false,
    }
  );

// ============================================================
// QUESTION SCHEMA
// ============================================================

const questionSchema =
  new Schema<IQuestionBank>(
    {
      // ======================================================
      // QUESTION
      // ======================================================

      questionNumber: {
        type: Number,
        required: true,
        min: 1,
      },

      subjectQuestionNumber: {
        type: Number,
        default: 0,
      },

      globalQuestionNumber: {
        type: Number,
        default: 0,
      },

      question: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================
      // OPTIONS
      // MCQ -> EXACTLY 4
      // TABLE / DIAGRAM -> OPTIONAL
      // ======================================================

      options: {
        type: [String],
        default: [],

        validate: {
          validator: (
            value: unknown[]
          ) => {
            if (!Array.isArray(value)) {
              return false;
            }

            // MCQ -> exactly 4
            // TABLE / DIAGRAM -> empty allowed
            return (
              value.length === 0 ||
              value.length === 4
            );
          },

          message:
            "Options must contain either 0 or exactly 4 items",
        },
      },

      // ======================================================
      // ANSWER
      // ======================================================

      correctAnswer: {
        type: String,
        default: "",
        trim: true,
      },

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

        enum: [
          "MCQ",
          "TABLE",
          "DIAGRAM",
        ],

        default: "MCQ",

        required: true,
      },

      // ======================================================
      // TABLE HEADERS
      // ======================================================

      tableHeaders: {
        type: [String],
        default: [],
      },

      // ======================================================
      // TABLE ROWS
      // ======================================================

      tableRows: {
        type: [[String]],
        default: [],
      },

      // ======================================================
      // SUBJECT
      // ======================================================

      subject: {
        type: String,

        required: true,

        trim: true,

        enum: [
          "Physics",
          "Chemistry",
          "Botany",
          "Zoology",
          "Mathematics",
        ],
      },

      chapter: {
        type: String,
        default: "",
        trim: true,
      },

      subjectOrder: {
        type: Number,
        default: 1,
      },

      // ======================================================
      // EXAM
      // ======================================================

      testCategory: {
        type: String,

        enum: [
          "mock",
          "daily",
          "subject",
        ],

        required: true,
      },

      // ------------------------------------------------------
      // Exam Type
      //
      // Mock / Daily -> JEE / NEET
      // Subject       -> "" (Not Applicable)
      // ------------------------------------------------------

      examType: {
        type: String,

        enum: [
          "NEET",
          "JEE",
          "",
        ],

        required: true,

        default: "",
      },

      className: {
        type: String,

        enum: [
          "1st PUC",
          "2nd PUC",
        ],

        required: true,
      },

      testTitle: {
        type: String,

        default:
          "Untitled Test",

        trim: true,
      },

      // ------------------------------------------------------
      // UNIQUE TEST IDENTIFIER
      // ------------------------------------------------------
      // Each Mock Test / Daily Test / Subject Test
      // can have its own testId.
      // ------------------------------------------------------

      testId: {
        type: String,

        required: true,

        index: true,

        trim: true,
      },

      totalQuestions: {
        type: Number,

        default: 0,

        min: 0,
      },

      // ======================================================
      // MARKING
      // ======================================================

      marksPerQuestion: {
        type: Number,

        default: 4,

        min: 0,
      },

      negativeMarks: {
        type: Number,

        default: 1,

        min: 0,
      },

      // ======================================================
      // EXAM TIMING
      // ======================================================

      durationMinutes: {
        type: Number,

        default: 180,

        min: 1,
      },

      testDate: {
        type: String,

        default: "",

        trim: true,
      },

      testTime: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // MOCK TEST SCHEDULED PUBLISH
      // ======================================================
      //
      // ONLY Mock Test uses this field.
      //
      // Daily Test:
      //   publishAt = null
      //
      // Subject Test:
      //   publishAt = null
      //
      // Mock Test:
      //   publishAt = selected publish date/time
      //
      // ======================================================

      publishAt: {
        type: Date,

        default: null,

        index: true,
      },

      // ======================================================
      // OWNER
      // ======================================================

      teacherId: {
        type: String,

        default: "HEAD",

        trim: true,
      },

      // ======================================================
      // PDF
      // ======================================================

      pdfId: {
        type: String,

        default: "manual",

        trim: true,
      },

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

      isAnswerCompleted: {
        type: Boolean,

        default: false,
      },

      isPublished: {
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

      targetExamLevel: {
        type: String,

        enum: [
          "board",
          "NEET",
          "JEE",
          "NEET/JEE",
        ],

        default: "board",
      },

      // ======================================================
      // IMAGE / DIAGRAM
      // ======================================================

      imageUrl: {
        type: String,

        default: "",

        trim: true,
      },

      questionImage: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // AI
      // ======================================================

      aiGenerated: {
        type: Boolean,

        default: false,
      },

      aiVerified: {
        type: Boolean,

        default: false,
      },

      aiStatus: {
        type: String,

        enum: [
          "pending",
          "correct",
          "wrong",
          "not_checked",
        ],

        default: "not_checked",
      },

      aiIssues: {
        type: [aiIssueSchema],

        default: [],
      },

      aiExplanation: {
        type: String,

        default: "",

        trim: true,
      },

      aiCheckedAt: {
        type: Date,
      },

      // ======================================================
      // SOURCE
      // ======================================================

      sourceType: {
        type: String,

        enum: [
          "manual",
          "pdf",
          "ai",
        ],

        default: "manual",
      },
    },

    // ========================================================
    // TIMESTAMPS
    // ========================================================

    {
      timestamps: true,
    }
  );

// ============================================================
// INDEXES
// ============================================================

// Exam category filtering
questionSchema.index({
  examType: 1,
  className: 1,
  testCategory: 1,
});

// Subject filtering
questionSchema.index({
  subject: 1,
});

// Test + question ordering
questionSchema.index({
  testId: 1,
  questionNumber: 1,
});

// Published questions
questionSchema.index({
  isPublished: 1,
});

// ============================================================
// MOCK SCHEDULE INDEX
// ============================================================

questionSchema.index({
  testCategory: 1,
  testId: 1,
  publishAt: 1,
  isPublished: 1,
});

// AI status
questionSchema.index({
  aiStatus: 1,
});

// Question type
questionSchema.index({
  questionType: 1,
});

// PDF question-bank queries
questionSchema.index({
  pdfId: 1,
});

// ============================================================
// MODEL
// ============================================================

const QuestionBank: Model<IQuestionBank> =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestionBank>(
    "QuestionBank",
    questionSchema,
    "questionbanks"
  );

export default QuestionBank;
