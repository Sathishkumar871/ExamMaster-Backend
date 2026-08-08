import mongoose, {
  Schema,
  Document
} from "mongoose";

export interface IQuestion {
  questionId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  imageUrl?: string;
}

export interface IDailyTest extends Document {
  teacherId: string;
  title: string;
  targetPage: string;              // "mock", "daily", or "weekly"
  puYear: "First PU" | "Second PU"; // "First PU" or "Second PU"
  subject: string;
  chapter: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  duration: number;
  totalMarks: number;
  negativeMarks: number;
  totalQuestions: number;
  active: boolean;
  isPublished: boolean;
  publishDate: Date;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionId: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (value: string[]) => value.length === 4,
      message: "Exactly 4 options required"
    }
  },
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ""
  },
  imageUrl: {
    type: String,
    default: ""
  }
});

const DailyTestSchema = new Schema<IDailyTest>(
  {
    teacherId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    targetPage: {
      type: String,
      default: "daily",
      required: true
    },
    puYear: {
      type: String,
      enum: ["First PU", "Second PU"],
      default: "First PU",
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    chapter: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Mixed"],
      default: "Mixed",
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    totalMarks: {
      type: Number,
      required: true
    },
    negativeMarks: {
      type: Number,
      default: 1
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishDate: {
      type: Date,
      default: Date.now
    },
    questions: [QuestionSchema]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IDailyTest>(
  "DailyTest",
  DailyTestSchema
);