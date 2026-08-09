import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion extends Document {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;
  chapter: string;
  subject: string;
  teacherId: string;
  pdfId: string;
  pdfSourceUrl: string;
  status: "pending" | "completed" | "published";
  isAnswerCompleted: boolean;
  examTags: string[];
  isPublished: boolean;

  // New fields
  testType?: string;
  testTitle?: string;
  targetExamLevel?: string;
  imageUrl?: string; 
}

const QuestionSchema: Schema = new Schema(
  {
    questionNumber: {
      type: Number,
      required: true,
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
        validator: (arr: string[]) => arr.length === 4,
        message: "Question must contain exactly 4 options.",
      },
    },

    correctAnswer: {
      type: String,
      default: "",
    },

    ansNumber: {
      type: String,
      default: "",
    },

    questionType: {
      type: String,
      default: "MCQ",
    },

    chapter: {
      type: String,
      default: "General",
    },

    subject: {
      type: String,
      required: true,
    },

    teacherId: {
      type: String,
      default: "HEAD",
    },

    pdfId: {
      type: String,
      default: "manual",
    },

    pdfSourceUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "completed", "published"],
      default: "pending",
    },

    isAnswerCompleted: {
      type: Boolean,
      default: false,
    },

    examTags: {
      type: [String],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    // Test & Exam configuration fields
    testType: {
      type: String,
      default: "subject",
    },

    testTitle: {
      type: String,
      default: "",
    },

    targetExamLevel: {
      type: String,
      default: "board",
    },

    // Image URL field
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent OverwriteModelError
const QuestionBank =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestion>("QuestionBank", QuestionSchema);

export default QuestionBank;