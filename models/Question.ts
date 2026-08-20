import { Schema, model, Document } from "mongoose";

export interface IQuestion extends Document {
  question: string;
  options: string[];
  correctAnswer: string;

  // Question belongs to which subject
  subject: string;

  // Where this question should be used
  type: "mock" | "daily";
}

const questionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length === 4,
        message: "Exactly 4 options are required",
      },
    },

    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      enum: [
        "Physics",
        "Chemistry",
        "Botany",
        "Zoology",
        "Mathematics",
      ],
    },

    type: {
      type: String,
      required: true,
      enum: ["mock", "daily"],
      default: "mock",
    },
  },
  {
    timestamps: true,
  }
);

export const Question = model<IQuestion>(
  "Question",
  questionSchema,
  "questions"
);