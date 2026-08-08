import mongoose, { Schema, Document } from "mongoose";

export interface ITeacher extends Document {

  teacherId: string;

  name: string;

  accessCode: string;

  mobile: string;

  email?: string;

  password?: string;


  // Education
  educationType: string;


  // Multiple Classes
  classIds: string[];

  classNames: string[];


  // Section
  sections: string[];


  // Subject
  subject: string;


  // Role
  role: string;


  // Teacher / Mentor
  teacherType: "teacher" | "mentor";


  isApproved: boolean;


  createdAt: Date;

  updatedAt: Date;

}



const teacherSchema = new Schema<ITeacher>(

{

  teacherId: {

    type: String,

    required: true,

    unique: true

  },


  name: {

    type: String,

    required: true

  },


  accessCode: {

    type: String,

    required: true,

    unique: true

  },


  mobile: {

    type: String,

    required: true,

    unique: true

  },


  email: {

    type: String,

    lowercase:true,

    default:""

  },


  password: {

    type:String,

    default:""

  },


  educationType: {

    type:String,

    required:true

  },


  // Example:
  // [
  // "INTER-FIRST-YEAR",
  // "INTER-SECOND-YEAR"
  // ]

  classIds: [

    {

      type:String,

      required:true

    }

  ],



  // Example:
  // [
  // "Inter MPC First Year",
  // "Inter MPC Second Year"
  // ]

  classNames: [

    {

      type:String,

      required:true

    }

  ],



  // Example:
  // ["A","B"]

  sections:[

    {

      type:String,
         required:true
    }

  ],



  subject:{

    type:String,

    required:true

  },



  role:{

    type:String,

    default:"teacher"

  },



  teacherType:{

    type:String,

    enum:[

      "teacher",

      "mentor"

    ],

    default:"teacher"

  },



  isApproved:{

    type:Boolean,

    default:true

  }


},

{

 timestamps:true

}

);



export default mongoose.model<ITeacher>(

"Teacher",

teacherSchema

);