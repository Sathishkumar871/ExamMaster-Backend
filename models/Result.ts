import mongoose, { Schema, Document } from "mongoose";

export interface IAnswerReview {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}
export interface IResult extends Document {
  studentId: string;
  studentName: string;

  teacherId: string;

  examId: string;
  examName: string;
  examType: "Daily" | "Weekly" | "Grand" | "Mock";

  subject: string;
  chapter: string;
  level: "Easy" | "Medium" | "Hard";

  totalQuestions: number;
  attemptedQuestions: number;
  unansweredQuestions: number;

  correctAnswers: number;
  wrongAnswers: number;

  marks: number;
  percentage: number;

  grade: string;
  status: "PASS" | "FAIL";

  timeTaken: number;
  warnings: number;
  rank: number;

  publishedDate: Date;

  review: IAnswerReview[];

  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IAnswerReview>({
  questionId: {
    type: String,
    required: true,
  },

  question: {
    type: String,
    required: true,
  },

  selectedAnswer: {
    type: String,
    required: true,
  },

  correctAnswer: {
    type: String,
    required: true,
  },

  isCorrect: {
    type: Boolean,
    required: true,
  },

  explanation: {
    type: String,
    default: "",
  },
});

const ResultSchema = new Schema<IResult>(
  {
    studentId: {
      type: String,
      required: true,
    },

    studentName: {
      type: String,
      default: "",
    },

    teacherId: {
      type: String,
      default: "",
    },

    examId: {
      type: String,
      default: "",
    },

    examName: {
      type: String,
      required: true,
    },

    examType: {
      type: String,
      enum: ["Daily", "Weekly", "Grand", "Mock"],
      default: "Daily",
    },

    subject: {
      type: String,
      required: true,
    },

    chapter: {
      type: String,
      required: true,
    },

    level: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },

    totalQuestions: {
      type: Number,
      required: true,
    },

    attemptedQuestions: {
      type: Number,
      default: 0,
    },

    unansweredQuestions: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      required: true,
    },

    wrongAnswers: {
      type: Number,
      required: true,
    },

    marks: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      required: true,
    },

    grade: {
      type: String,
      default: "F",
    },

    status: {
      type: String,
      enum: ["PASS", "FAIL"],
      default: "FAIL",
    },

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

    publishedDate: {
      type: Date,
      default: Date.now,
    },

    review: {
      type: [ReviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IResult>(
  "Result",
  ResultSchema
);