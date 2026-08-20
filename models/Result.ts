import mongoose, { Schema, Document } from "mongoose";

// 1. Review Structure
export interface IAnswerReview {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}


export interface IResult extends Document {
  studentId: string;
  studentName: string;
  examId: string;
  examName: string;
  testCategory: string;
  subject: string;
  chapter: string; 
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
  review: IAnswerReview[];
}

const ReviewSchema = new Schema<IAnswerReview>({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  selectedAnswer: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
});

const ResultSchema = new Schema<IResult>(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    examId: { type: String, required: true },
    examName: { type: String, required: true },
    testCategory: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true }, 
    
    totalQuestions: { type: Number, required: true },
    attemptedQuestions: { type: Number, required: true },
    unansweredQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    wrongAnswers: { type: Number, required: true },
    
    marks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    status: { type: String, enum: ["PASS", "FAIL"], required: true },
    
    timeTaken: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    
    review: { type: [ReviewSchema], required: true },
  },
  {
    timestamps: true, 
  }
);

export default mongoose.model<IResult>("Result", ResultSchema);