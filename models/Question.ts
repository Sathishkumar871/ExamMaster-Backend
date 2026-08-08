import mongoose,{Schema,Document} from "mongoose";


export interface IQuestion extends Document{

subject:string;

question:string;

options:string[];

correctAnswer:string;

explanation:string;

}


const QuestionSchema =
new Schema<IQuestion>({

subject:{
type:String,
required:true
},


question:{
type:String,
required:true
},


options:{
type:[String],
required:true
},


correctAnswer:{
type:String,
required:true
},


explanation:{
type:String,
default:""
}


},
{
timestamps:true
});


export default mongoose.model<IQuestion>(
"Question",
QuestionSchema
);