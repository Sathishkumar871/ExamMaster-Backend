import mongoose, { Schema, Document } from "mongoose";


export interface IExamSession extends Document {

  studentId: string;

  examId: mongoose.Types.ObjectId;

  questions: mongoose.Types.ObjectId[];

  answers: {
    questionId: string;
    answer: string;
  }[];

  score: number;

  status: "started" | "completed";

  startTime: Date;

  endTime?: Date;

}




const ExamSessionSchema = new Schema<IExamSession>(

{

  studentId: {

    type: String,

    required: true

  },


  examId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: "Exam",

    required: true

  },



  questions: [

    {

      type: mongoose.Schema.Types.ObjectId,

      ref: "QuestionBank",

      required: true

    }

  ],



  answers: [

    {

      questionId: {

        type: String,

        required: true

      },


      answer: {

        type: String,

        default: ""

      }

    }

  ],




  score: {

    type: Number,

    default: 0

  },



  status: {

    type: String,

    enum: [

      "started",

      "completed"

    ],

    default: "started"

  },



  startTime: {

    type: Date,

    default: Date.now

  },



  endTime: {

    type: Date

  }



},

{

  timestamps: true

}

);





// Prevent OverwriteModelError

const ExamSession =

mongoose.models.ExamSession ||

mongoose.model<IExamSession>(

  "ExamSession",

  ExamSessionSchema

);



export default ExamSession;