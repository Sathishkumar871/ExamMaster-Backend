import mongoose, {
  Schema,
  Document,
} from "mongoose";

// ============================================================
// INTERFACE
// ============================================================

export interface IExamSession extends Document {
  studentId: string;

  // Normal Exam ObjectId optional
  examId?: mongoose.Types.ObjectId;

  // Subject Exam custom testId
  testId?: string;

  questions: mongoose.Types.ObjectId[];

  answers: {
    questionId: string;
    answer: string;
  }[];

  score: number;

  status:
    | "started"
    | "completed";

  startTime: Date;

  endTime?: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const ExamSessionSchema =
  new Schema<IExamSession>(
    {
      studentId: {
        type: String,
        required: true,
      },

      // ======================================================
      // NORMAL EXAM ID
      // ======================================================

      examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: false,
      },

      // ======================================================
      // SUBJECT EXAM TEST ID
      // ======================================================

      testId: {
        type: String,
        required: false,
        index: true,
      },

      // ======================================================
      // QUESTIONS
      // ======================================================

      questions: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref: "QuestionBank",

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

export default ExamSession;