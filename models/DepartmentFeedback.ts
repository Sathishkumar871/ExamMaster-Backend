import mongoose, { Schema, Document } from "mongoose";


export interface IDepartmentFeedback extends Document {


studentId:string;

studentName:string;

classId:string;

className:string;

section:string;



health?:{

status:string;

fitness:string;

sleep:string;

stress:string;

medicalRequired:boolean;

notes:string;

};



food?:{

satisfaction:string;

mealPattern:string;

waterIntake:string;

nutritionQuality:string;

concerns:string[];

feedback:string;

};





hostel?:{

hostelAdjustment:string;

roomEnvironment:string;

roommateRelationship:string;

cleanliness:string;

food:string;

water:string;

bathroom:string;

safety:string;

studyEnvironment:string;

complaints:string[];

mentorRemarks:string;

};






behavior?:{

discipline:string;

respectToFaculty:string;

respectToStudents:string;

communication:string;

leadership:string;

teamWork:string;

attendance:string;

punctuality:string;

classParticipation:string;

mobileUsage:string;

mentorRemarks:string;

};







academic?:{

overallPerformance:string;

attendancePercentage:string;

assignmentCompletion:string;

homeworkCompletion:string;

classParticipation:string;

weakSubjects:string[];

strongSubjects:string[];

learningAbility:string;

examPreparation:string;

concentrationLevel:string;

mentorSuggestions:string;

};





mentorActionPlan?:string;




sourceType:
"mentor" |
"student" |
"manager";




updatedBy:string;



updatedByRole:
"mentor" |
"student" |
"manager";



createdAt:Date;

updatedAt:Date;


}









const DepartmentFeedbackSchema =
new Schema<IDepartmentFeedback>(

{


studentId:{

type:String,

required:true

},



studentName:{

type:String,

required:true

},



classId:{

type:String,

required:true

},



className:{

type:String,

required:true

},



section:{

type:String,

required:true

},







health:{


status:String,

fitness:String,

sleep:String,

stress:String,

medicalRequired:Boolean,

notes:String


},







food:{


satisfaction:String,

mealPattern:String,

waterIntake:String,

nutritionQuality:String,

concerns:[String],

feedback:String


},







hostel:{


hostelAdjustment:String,

roomEnvironment:String,

roommateRelationship:String,

cleanliness:String,

food:String,

water:String,

bathroom:String,

safety:String,

studyEnvironment:String,

complaints:[String],

mentorRemarks:String


},







behavior:{


discipline:String,

respectToFaculty:String,

respectToStudents:String,

communication:String,

leadership:String,

teamWork:String,

attendance:String,

punctuality:String,

classParticipation:String,

mobileUsage:String,

mentorRemarks:String


},







academic:{


overallPerformance:String,

attendancePercentage:String,

assignmentCompletion:String,

homeworkCompletion:String,

classParticipation:String,

weakSubjects:[String],

strongSubjects:[String],

learningAbility:String,

examPreparation:String,

concentrationLevel:String,

mentorSuggestions:String


},






mentorActionPlan:String,








sourceType:{


type:String,


enum:[

"mentor",

"student",

"manager"

],


required:true


},







updatedBy:{


type:String,

required:true


},







updatedByRole:{


type:String,


enum:[

"mentor",

"student",

"manager"

],


required:true


}



},


{

timestamps:true

}



);







export default mongoose.model<IDepartmentFeedback>(

"DepartmentFeedback",

DepartmentFeedbackSchema

);