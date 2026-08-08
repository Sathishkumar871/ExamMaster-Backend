import mongoose, { Schema, Document } from "mongoose";


export interface IResult extends Document {


  studentId: string;

  studentName: string;


  examId: mongoose.Types.ObjectId;


  examName: string;


  subject: string;



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



  review: {

    questionId: mongoose.Types.ObjectId;

    question: string;

    selectedAnswer: string;

    correctAnswer: string;

    isCorrect: boolean;

  }[];



}







const ResultSchema = new Schema<IResult>(


{


studentId:{


type:String,

required:true


},




studentName:{


type:String,

default:""


},





examId:{


type:mongoose.Schema.Types.ObjectId,

ref:"Exam",

required:true


},





examName:{


type:String,

default:"Exam"


},





subject:{


type:String,

default:"General"


},





totalQuestions:{


type:Number,

required:true


},




attemptedQuestions:{


type:Number,

default:0


},





unansweredQuestions:{


type:Number,

default:0


},





correctAnswers:{


type:Number,

default:0


},




wrongAnswers:{


type:Number,

default:0


},





marks:{


type:Number,

default:0


},





percentage:{


type:Number,

default:0


},





grade:{


type:String,

default:"F"


},





status:{


type:String,

enum:[

"PASS",

"FAIL"

],


default:"FAIL"


},





timeTaken:{


type:Number,

default:0


},





warnings:{


type:Number,

default:0


},





rank:{


type:Number,

default:0


},





review:[

{


questionId:{


type:mongoose.Schema.Types.ObjectId,

ref:"QuestionBank"


},


question:String,


selectedAnswer:String,


correctAnswer:String,


isCorrect:Boolean



}

]



},


{

timestamps:true

}

);






// Prevent OverwriteModelError

const Result =

mongoose.models.Result ||

mongoose.model<IResult>(

"Result",

ResultSchema

);



export default Result;