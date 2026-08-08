import mongoose, { Schema, Document } from "mongoose";


export interface IExam extends Document {

  title: string;

  subject: string;

  chapter: string;

  className: string;

  examType:
    | "daily"
    | "weekly"
    | "mock";

  duration: number; // minutes

  totalQuestions: number;

  questions: mongoose.Types.ObjectId[];

  createdBy: string; // teacherId

  status:
    | "draft"
    | "published"
    | "completed";

  isPublished: boolean;

}



const ExamSchema: Schema = new Schema(

  {


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

      required: true

    },



    examType: {

      type: String,

      enum: [

        "daily",

        "weekly",

        "mock"

      ],

      default: "daily"

    },



    duration: {

      type: Number,

      required: true,

      default: 180

    },



    totalQuestions: {

      type: Number,

      required: true

    },



    questions: [

      {

        type: mongoose.Schema.Types.ObjectId,

        ref: "QuestionBank"

      }

    ],



    createdBy: {

      type: String,

      required: true

    },



    status: {

      type: String,

      enum: [

        "draft",

        "published",

        "completed"

      ],

      default: "draft"

    },



    isPublished: {

      type: Boolean,

      default: false

    }


  },


  {

    timestamps: true

  }


);




// Prevent OverwriteModelError

const Exam =

  mongoose.models.Exam ||

  mongoose.model<IExam>(

    "Exam",

    ExamSchema

  );


export default Exam;