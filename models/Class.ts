import mongoose, {
Schema,
Document
} from "mongoose";


export interface IClass extends Document {


classId:string;

className:string;

educationType:string;

section:string;


}



const ClassSchema = new Schema<IClass>({



classId:{

type:String,

required:true,

unique:true

},




className:{

type:String,

required:true

},




educationType:{

type:String,

required:true

},




section:{

type:String

}



},
{
timestamps:true
});




export default mongoose.model<IClass>(

"Class",

ClassSchema

);