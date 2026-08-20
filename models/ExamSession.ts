import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// INTERFACE
// ============================================================

export interface IExamSession extends Document {
  // Student ID optional
  studentId?: string;

  // Exam ID optional
  examId?: mongoose.Types.ObjectId;

  // Mock test ki custom identifier
  testId?: string;

  // Questions used in this session
  questions: mongoose.Types.ObjectId[];

  // Student answers
  answers: {
    questionId: string;
    answer: string;
  }[];

  // Score
  score: number;

  // Session status
  status:
    | "started"
    | "completed";

  // Time
  startTime: Date;

  endTime?: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const ExamSessionSchema =
  new Schema<IExamSession>(
    {
      // ======================================================
      // STUDENT ID
      // OPTIONAL
      // ======================================================

      studentId: {
        type: String,
        required: false,
        default: undefined,
      },

      // ======================================================
      // EXAM ID
      // OPTIONAL
      // ======================================================

      examId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Exam",

        required: false,

        default: undefined,
      },

      // ======================================================
      // TEST ID
      // OPTIONAL
      //
      // Future subject/daily tests kosam
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

      answers: [
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
      ],

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
      },

      // ======================================================
      // START TIME
      // ======================================================

      startTime: {
        type: Date,

        default: Date.now,
      },

      // ======================================================
      // END TIME
      // ======================================================

      endTime: {
        type: Date,

        required: false,
      },
    },

    {
      timestamps: true,
    }
  );

// ============================================================
// PREVENT OVERWRITE MODEL ERROR
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