import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// REVIEW INTERFACE
// ============================================================

export interface IResultReview {
  questionId: mongoose.Types.ObjectId;

  question: string;

  questionType?:
    | "MCQ"
    | "TABLE"
    | "DIAGRAM";

  options?: string[];

  imageUrl?: string;

  questionImage?: string;

  tableHeaders?: string[];

  tableRows?: string[][];

  selectedAnswer: string;

  correctAnswer: string;

  isCorrect: boolean;

  marks?: number;

  result?:
    | "correct"
    | "wrong"
    | "unanswered"
    | "not_evaluated";

  explanation?: string;
}

// ============================================================
// RESULT INTERFACE
// ============================================================

export interface IResult
  extends Document {
  studentId: string;

  studentName: string;

  examId?:
    | mongoose.Types.ObjectId
    | null;

  examName: string;

  testCategory:
    | "mock"
    | "daily"
    | "subject";

  examType?: string;

  subject: string;

  chapter: string;

  className: string;

  totalQuestions: number;

  attemptedQuestions: number;

  unansweredQuestions: number;

  correctAnswers: number;

  wrongAnswers: number;

  marks: number;

  maxMarks: number;

  marksPerQuestion: number;

  negativeMarks: number;

  percentage: number;

  grade: string;

  status:
    | "PASS"
    | "FAIL";

  timeTaken: number;

  warnings: number;

  autoSubmitted: boolean;

  rank: number;

  resultAvailableAt: Date;

  isResultPublished: boolean;

  review: IResultReview[];
}

// ============================================================
// REVIEW SCHEMA
// ============================================================

const ReviewSchema =
  new Schema<IResultReview>(
    {
      questionId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "QuestionBank",

        required: true,
      },

      question: {
        type: String,

        default: "",
      },

      questionType: {
        type: String,

        enum: [
          "MCQ",
          "TABLE",
          "DIAGRAM",
        ],

        default: "MCQ",
      },

      options: {
        type: [String],

        default: [],
      },

      imageUrl: {
        type: String,

        default: "",
      },

      questionImage: {
        type: String,

        default: "",
      },

      tableHeaders: {
        type: [String],

        default: [],
      },

      tableRows: {
        type: [[String]],

        default: [],
      },

      selectedAnswer: {
        type: String,

        required: true,

        default: "Not Attempted",

        trim: true,
      },

      correctAnswer: {
        type: String,

        required: true,

        default: "Not Available",

        trim: true,
      },

      isCorrect: {
        type: Boolean,

        default: false,
      },

      marks: {
        type: Number,

        default: 0,
      },

      result: {
        type: String,

        enum: [
          "correct",
          "wrong",
          "unanswered",
          "not_evaluated",
        ],

        default: "unanswered",
      },

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

const ResultSchema =
  new Schema<IResult>(
    {
      // ======================================================
      // STUDENT
      // ======================================================

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

      // ======================================================
      // EXAM
      // ======================================================

      examId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Exam",

        default: null,
      },

      examName: {
        type: String,

        default: "Exam",

        trim: true,
      },

      // ======================================================
      // CATEGORY
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

        index: true,
      },

      // ======================================================
      // EXAM TYPE
      // ======================================================

      examType: {
        type: String,

        default: "MOCK",

        trim: true,
      },

      // ======================================================
      // SUBJECT
      // ======================================================

      subject: {
        type: String,

        required: true,

        default: "General",

        trim: true,

        index: true,
      },

      // ======================================================
      // CHAPTER
      // ======================================================

      chapter: {
        type: String,

        default: "Full Assessment",

        trim: true,
      },

      // ======================================================
      // CLASS
      // ======================================================

      className: {
        type: String,

        default: "",

        trim: true,
      },

      // ======================================================
      // QUESTION COUNTS
      // ======================================================

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

      // ======================================================
      // ANSWER COUNTS
      // ======================================================

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

      // ======================================================
      // MARKS
      // ======================================================

      marks: {
        type: Number,

        default: 0,
      },

      maxMarks: {
        type: Number,

        default: 0,
      },

      marksPerQuestion: {
        type: Number,

        default: 4,
      },

      negativeMarks: {
        type: Number,

        default: 1,
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

        enum: [
          "PASS",
          "FAIL",
        ],

        default: "FAIL",
      },

      // ======================================================
      // EXAM DETAILS
      // ======================================================

      timeTaken: {
        type: Number,

        default: 0,
      },

      warnings: {
        type: Number,

        default: 0,
      },

      autoSubmitted: {
        type: Boolean,

        default: false,
      },

      rank: {
        type: Number,

        default: 0,
      },

      // ======================================================
      // RESULT RELEASE
      // ======================================================

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

      // ======================================================
      // REVIEW
      // ======================================================

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
  studentId: 1,
  examId: 1,
  testCategory: 1,
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
// MODEL
// ============================================================

const Result =
  mongoose.models.Result ||
  mongoose.model<IResult>(
    "Result",
    ResultSchema
  );

export default Result;