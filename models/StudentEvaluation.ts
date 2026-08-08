import mongoose,{Schema,Document} from "mongoose";


export interface IStudentEvaluation extends Document{


studentId:string;

category:string;


ratings:{

name:string;

score:number;

}[];


average:number;


updatedBy:string;


createdAt:Date;

updatedAt:Date;

}



const StudentEvaluationSchema =
new Schema<IStudentEvaluation>(

{


studentId:{

type:String,

required:true

},



category:{

type:String,

required:true

},



ratings:[

{

name:String,

score:Number

}

],



average:{

type:Number,

default:0

},



updatedBy:{

type:String

}


},

{

timestamps:true

}

);



export default mongoose.model<IStudentEvaluation>(

"StudentEvaluation",

StudentEvaluationSchema

);