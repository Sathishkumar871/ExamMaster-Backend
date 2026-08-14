
import mongoose, {
  Schema,
  Document
} from "mongoose";


// =====================================
// EXAM INTERFACE
// =====================================

export interface IExam extends Document {

  title: string;

  subject: string;

  chapter: string;

  className: string;

  examType:
    | "daily"
    | "weekly"
    | "subject"
    | "mock";

  duration: number;

  totalQuestions: number;

  questions:
    mongoose.Types.ObjectId[];

  createdBy: string;

  status:
    | "draft"
    | "published"
    | "completed";

  isPublished: boolean;

  createdAt: Date;

  updatedAt: Date;

}


// =====================================
// EXAM SCHEMA
// =====================================

const ExamSchema =
  new Schema<IExam>(

    {

      // =================================
      // BASIC INFORMATION
      // =================================

      title: {

        type: String,

        required: true,

        trim: true

      },


      subject: {

        type: String,

        required: true,

        trim: true

      },


      chapter: {

        type: String,

        default: "All",

        trim: true

      },


      className: {

        type: String,

        required: true,

        trim: true

      },


      // =================================
      // EXAM TYPE
      // =================================

      examType: {

        type: String,

        enum: [
          "daily",
          "weekly",
          "subject",
          "mock"
        ],

        default: "mock",

        required: true

      },


      // =================================
      // DURATION
      // =================================

      duration: {

        type: Number,

        required: true,

        default: 180,

        min: 1

      },


      // =================================
      // TOTAL QUESTIONS
      // =================================

      totalQuestions: {

        type: Number,

        required: true,

        min: 1

      },


      // =================================
      // QUESTION IDS
      // =================================

      questions: [

        {

          type:
            mongoose.Schema.Types.ObjectId,

          ref:
            "QuestionBank",

          required: true

        }

      ],


      // =================================
      // CREATED BY TEACHER
      // =================================

      createdBy: {

        type: String,

        required: true,

        trim: true

      },


      // =================================
      // EXAM STATUS
      // =================================

      status: {

        type: String,

        enum: [
          "draft",
          "published",
          "completed"
        ],

        default: "draft",

        required: true

      },


      // =================================
      // PUBLISHED FLAG
      // =================================

      isPublished: {

        type: Boolean,

        default: false

      }

    },

    {

      timestamps: true

    }

  );


// =====================================
// MODEL
// =====================================

const Exam =
  mongoose.models.Exam ||
  mongoose.model<IExam>(
    "Exam",
    ExamSchema
  );


export default Exam;

