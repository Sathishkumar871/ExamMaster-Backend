
import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// TYPES
// ============================================================

export interface IExamSessionAnswer {
  questionId: string;
  answer: string;
}

export interface IExamSession
  extends Document {
  // ==========================================================
  // STUDENT
  // ==========================================================

  studentId?: string;

  // ==========================================================
  // EXAM
  // ==========================================================

  examId?: mongoose.Types.ObjectId;

  // ==========================================================
  // TEST ID
  // ==========================================================

  testId?: string;

  // ==========================================================
  // QUESTIONS
  // ==========================================================

  questions: mongoose.Types.ObjectId[];

  // ==========================================================
  // ANSWERS
  // ==========================================================

  answers: IExamSessionAnswer[];

  // ==========================================================
  // REVIEW MARKS
  // ==========================================================

  markedForReview: Record<
    string,
    boolean
  >;

  // ==========================================================
  // CURRENT QUESTION
  // ==========================================================

  currentQuestion: number;

  // ==========================================================
  // SCORE
  // ==========================================================

  score: number;

  // ==========================================================
  // STATUS
  // ==========================================================

  status:
    | "started"
    | "completed";

  // ==========================================================
  // START TIME
  // ==========================================================

  startTime: Date;

  // ==========================================================
  // END / SUBMIT TIME
  // ==========================================================

  endTime?: Date;

  submittedAt?: Date;

  // ==========================================================
  // SERVER CONTROLLED EXAM DURATION
  // ==========================================================
  //
  // IMPORTANT:
  // This is stored in SECONDS.
  //
  // Example:
  // 100 questions × 60 sec = 6000 sec
  //
  // Timer should always be calculated from:
  //
  // startTime + durationSeconds
  //
  // So browser refresh cannot reset timer.
  //
  // ==========================================================

  durationSeconds: number;

  // ==========================================================
  // ACTIVE LOGIN SESSION
  // ==========================================================
  //
  // New device login creates a new session ID.
  //
  // Old device will fail heartbeat because its
  // session ID is no longer the current one.
  //
  // ==========================================================

  deviceSessionId: string;

  // ==========================================================
  // DEVICE ID
  // ==========================================================

  deviceId: string;

  // ==========================================================
  // LAST ACTIVITY
  // ==========================================================

  lastActivityAt: Date;
}

// ============================================================
// ANSWER SCHEMA
// ============================================================

const ExamSessionAnswerSchema =
  new Schema<IExamSessionAnswer>(
    {
      questionId: {
        type: String,
        required: true,
      },

      answer: {
        type: String,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

// ============================================================
// MAIN SCHEMA
// ============================================================

const ExamSessionSchema =
  new Schema<IExamSession>(
    {
      // ======================================================
      // STUDENT ID
      // ======================================================

      studentId: {
        type: String,

        required: false,

        default: undefined,

        index: true,
      },

      // ======================================================
      // EXAM ID
      // ======================================================

      examId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Exam",

        required: false,

        default: undefined,

        index: true,
      },

      // ======================================================
      // TEST ID
      // ======================================================

      testId: {
        type: String,

        required: false,

        index: true,

        default: undefined,
      },

      // ======================================================
      // QUESTIONS
      // ======================================================

      questions: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref: "Question",

          required: true,
        },
      ],

      // ======================================================
      // ANSWERS
      // ======================================================

      answers: {
        type:
          [ExamSessionAnswerSchema],

        default: [],
      },

      // ======================================================
      // MARKED FOR REVIEW
      // ======================================================

      markedForReview: {
        type: Schema.Types.Mixed,

        default: {},
      },

      // ======================================================
      // CURRENT QUESTION
      // ======================================================

      currentQuestion: {
        type: Number,

        default: 0,

        min: 0,
      },

      // ======================================================
      // SCORE
      // ======================================================

      score: {
        type: Number,

        default: 0,
      },

      // ======================================================
      // STATUS
      // ======================================================

      status: {
        type: String,

        enum: [
          "started",
          "completed",
        ],

        default: "started",

        index: true,
      },

      // ======================================================
      // START TIME
      // ======================================================

      startTime: {
        type: Date,

        default: Date.now,

        index: true,
      },

      // ======================================================
      // END TIME
      // ======================================================

      endTime: {
        type: Date,

        required: false,

        default: undefined,
      },

      // ======================================================
      // SUBMITTED AT
      // ======================================================

      submittedAt: {
        type: Date,

        required: false,

        default: undefined,
      },

      // ======================================================
      // SERVER CONTROLLED DURATION
      // ======================================================

      durationSeconds: {
        type: Number,

        required: true,

        default: 3600,

        min: 1,
      },

      // ======================================================
      // CURRENT LOGIN SESSION
      // ======================================================

      deviceSessionId: {
        type: String,

        required: true,

        index: true,
      },

      // ======================================================
      // DEVICE ID
      // ======================================================

      deviceId: {
        type: String,

        required: true,
      },

      // ======================================================
      // LAST ACTIVITY
      // ======================================================

      lastActivityAt: {
        type: Date,

        default: Date.now,

        index: true,
      },
    },

    {
      timestamps: true,
    }
  );

// ============================================================
// UNIQUE ACTIVE ATTEMPT
// ============================================================
//
// One student + one exam = one ExamSession.
//
// So:
//
// Student A
// Exam 123
//
// cannot create:
//
// Session 1
// Session 2
// Session 3
//
// after submission.
//
// ============================================================

ExamSessionSchema.index(
  {
    studentId: 1,
    examId: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

// ============================================================
// MODEL
// ============================================================
//
// Prevent:
//
// OverwriteModelError:
// Cannot overwrite `ExamSession` model.
//
// ============================================================

const ExamSession =
  mongoose.models.ExamSession ||
  mongoose.model<IExamSession>(
    "ExamSession",
    ExamSessionSchema
  );

// ============================================================
// EXPORT
// ============================================================

export default ExamSession;

