import mongoose, { Schema, Document } from "mongoose";

export interface IResult extends Document {

  // ============================================================
  // STUDENT
  // ============================================================

  studentId: string;

  studentName: string;


  // ============================================================
  // EXAM
  // ============================================================

  examId?: mongoose.Types.ObjectId | null;

  examName: string;


  // ============================================================
  // TEST CATEGORY
  // mock / daily / subject
  // ============================================================

  testCategory: "mock" | "daily" | "subject";


  // ============================================================
  // SUBJECT
  // ============================================================

  subject: string;


  // ============================================================
  // QUESTION STATS
  // ============================================================

  totalQuestions: number;

  attemptedQuestions: number;

  unansweredQuestions: number;


  // ============================================================
  // ANSWER STATS
  // ============================================================

  correctAnswers: number;

  wrongAnswers: number;


  // ============================================================
  // MARKS
  // ============================================================

  marks: number;

  percentage: number;

  grade: string;

  status: "PASS" | "FAIL";


  // ============================================================
  // EXAM DETAILS
  // ============================================================

  timeTaken: number;

  warnings: number;

  rank: number;


  // ============================================================
  // RESULT RELEASE SYSTEM
  // ============================================================

  // Immediate result:
  // daily / subject -> current time
  //
  // Delayed result:
  // mock -> next day 8:00 AM

  resultAvailableAt: Date;

  // true  -> student can see result
  // false -> result locked

  isResultPublished: boolean;


  // ============================================================
  // QUESTION REVIEW
  // ============================================================

  review: {

    questionId: mongoose.Types.ObjectId;

    question: string;

    selectedAnswer: string;

    correctAnswer: string;

    isCorrect: boolean;

    marks?: number;

  }[];

}


// ============================================================
// RESULT SCHEMA
// ============================================================

const ResultSchema = new Schema<IResult>(

  {

    // ============================================================
    // STUDENT
    // ============================================================

    studentId: {

      type: String,

      required: true,

      index: true,

    },


    studentName: {

      type: String,

      default: "",

    },


    // ============================================================
    // EXAM
    // ============================================================

    // Daily / Subject tests ki null avvachu

    examId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Exam",

      required: false,

      default: null,

    },


    examName: {

      type: String,

      default: "Exam",

    },


    // ============================================================
    // TEST CATEGORY
    // ============================================================

    testCategory: {

      type: String,

      enum: [

        "mock",

        "daily",

        "subject",

      ],

      required: true,

      default: "subject",

      index: true,

    },


    // ============================================================
    // SUBJECT
    // ============================================================

    subject: {

      type: String,

      required: true,

      default: "General",

      trim: true,

      index: true,

    },


    // ============================================================
    // QUESTION STATS
    // ============================================================

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


    // ============================================================
    // ANSWER STATS
    // ============================================================

    correctAnswers: {

      type: Number,

      default: 0,

    },


    wrongAnswers: {

      type: Number,

      default: 0,

    },


    // ============================================================
    // MARKS
    // ============================================================

    marks: {

      type: Number,

      default: 0,

    },


    percentage: {

      type: Number,

      default: 0,

    },


    grade: {

      type: String,

      default: "F",

    },


    status: {

      type: String,

      enum: [

        "PASS",

        "FAIL",

      ],

      default: "FAIL",

    },


    // ============================================================
    // EXAM DETAILS
    // ============================================================

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


    // ============================================================
    // RESULT RELEASE
    // ============================================================

    resultAvailableAt: {

      type: Date,

      required: true,

      index: true,

    },


    isResultPublished: {

      type: Boolean,

      default: false,

      index: true,

    },


    // ============================================================
    // REVIEW
    // ============================================================

    review: [

      {

        questionId: {

          type: mongoose.Schema.Types.ObjectId,

          ref: "QuestionBank",

        },


        question: {

          type: String,

          default: "",

        },


        selectedAnswer: {

          type: String,

          default: "",

        },


        correctAnswer: {

          type: String,

          default: "",

        },


        isCorrect: {

          type: Boolean,

          default: false,

        },


        marks: {

          type: Number,

          default: 0,

        },

      },

    ],

  },

  {

    timestamps: true,

  }

);


// ============================================================
// INDEXES
// ============================================================

ResultSchema.index({

  studentId: 1,

  createdAt: -1,

});


ResultSchema.index({

  testCategory: 1,

  resultAvailableAt: 1,

});


ResultSchema.index({

  isResultPublished: 1,

});


ResultSchema.index({

  subject: 1,

});


// ============================================================
// PREVENT OVERWRITE MODEL ERROR
// ============================================================

const Result =

  mongoose.models.Result ||

  mongoose.model<IResult>(

    "Result",

    ResultSchema

  );


export default Result;