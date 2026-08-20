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
  | "JEE";

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
  | "MCQ";

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
  className: ClassName; // 👈 academicYear బదులుగా className
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
  // IMAGE
  // ----------------------------------------------------------

  imageUrl: string;

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
      questionNumber: {
        type: Number,
        required: true,
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
      options: {
        type: [String],
        required: true,
        validate: {
          validator: (
            value: string[]
          ) =>
            Array.isArray(value) &&
            value.length === 4,
          message:
            "Exactly 4 options are required",
        },
      },
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
      questionType: {
        type: String,
        enum: ["MCQ"],
        default: "MCQ",
      },
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
      testCategory: {
        type: String,
        enum: [
          "mock",
          "daily",
          "subject",
        ],
        required: true,
      },
      examType: {
        type: String,
        enum: [
          "NEET",
          "JEE",
        ],
        required: true,
      },

      // ========================================================
      // CLASS NAME (Replaced academicYear)
      // ========================================================
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
        default: "Untitled Test",
        trim: true,
      },
      testId: {
        type: String,
        required: true,
        index: true,
      },
      totalQuestions: {
        type: Number,
        default: 0,
      },
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
      teacherId: {
        type: String,
        default: "HEAD",
      },
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
      imageUrl: {
        type: String,
        default: "",
        trim: true,
      },
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
      },
      aiCheckedAt: {
        type: Date,
      },
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
    {
      timestamps: true,
    }
  );

// ============================================================
// INDEXES
// ============================================================

questionSchema.index({
  examType: 1,
  className: 1, // 👈 ఇక్కడ కూడా academicYear బదులుగా className పెట్టబడింది
  testCategory: 1,
});

questionSchema.index({
  subject: 1,
});

questionSchema.index({
  testId: 1,
  questionNumber: 1,
});

questionSchema.index({
  isPublished: 1,
});

questionSchema.index({
  aiStatus: 1,
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