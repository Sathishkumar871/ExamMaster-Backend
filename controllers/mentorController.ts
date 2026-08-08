import { Response } from "express";

import DepartmentFeedback from "../models/DepartmentFeedback";
import Student from "../models/Student";
import Result from "../models/Result";




// ======================================
// MENTOR DASHBOARD
// GET /api/mentor/dashboard
// ======================================

export const getMentorDashboard = async (

req:any,

res:Response

)=>{


try{


const mentor = req.staff || req.teacher;



if(!mentor){

return res.status(401).json({

success:false,

message:"Mentor login required"

});

}







// SAME SECTION STUDENTS

const students = await Student.find({

section:mentor.section

});






const studentIds = students.map(

(student:any)=>

student.studentId

);






// SECTION STUDENT RESULTS

const results = await Result.find({

studentId:{

$in:studentIds

}

})

.sort({

createdAt:-1

});







return res.json({

success:true,


mentor:{


name:mentor.name,

section:mentor.section


},


students,


results


});




}

catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};











// ======================================
// SINGLE STUDENT PROGRESS CARD
// GET /api/mentor/student/:studentId
// ======================================


export const getStudentHistory = async (


req:any,


res:Response


)=>{


try{


const mentor = req.staff || req.teacher;


const {studentId}=req.params;





if(!mentor){


return res.status(401).json({

success:false,

message:"Mentor login required"

});


}







// CHECK SAME SECTION STUDENT


const student = await Student.findOne({

studentId,

section:mentor.section

});






if(!student){


return res.status(403).json({

success:false,

message:"Student not assigned to this mentor"

});


}








// RESULTS

const results = await Result.find({

studentId

})

.sort({

createdAt:-1

});









// LATEST FEEDBACK

const feedback = await DepartmentFeedback.findOne({

studentId

});








return res.json({

success:true,


student,


results,


feedback


});





}

catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};











// ======================================
// ADD / UPDATE MENTOR PROGRESS
// PUT /api/mentor/weekly-feedback
// ======================================


export const addMentorWeeklyFeedback = async (


req:any,


res:Response


)=>{


try{


const mentor = req.staff || req.teacher;





if(!mentor){


return res.status(401).json({

success:false,

message:"Mentor login required"

});


}








const {


studentId,


health,


food,


hostel,


behavior,


academic,


mentorActionPlan,


shareTo



}=req.body;









if(!studentId){


return res.status(400).json({

success:false,

message:"Student ID required"

});


}









// CHECK STUDENT SAME SECTION


const student = await Student.findOne({

studentId,

section:mentor.section

});








if(!student){


return res.status(403).json({

success:false,

message:"Student not assigned to this mentor"

});


}











// ======================================
// PREPARE UPDATE DATA
// ======================================


const updateData:any = {


studentId:student.studentId,


studentName:student.name,


classId:student.classId,


className:student.className,


section:student.section,



sourceType:"mentor",


updatedBy:mentor.name,


updatedByRole:"mentor",


shareTo:shareTo || "none"


};








// ONLY UPDATE AVAILABLE DATA


if(health){

updateData.health = health;

}



if(food){

updateData.food = food;

}



if(hostel){

updateData.hostel = hostel;

}



if(behavior){

updateData.behavior = behavior;

}



if(academic){

updateData.academic = academic;

}



if(mentorActionPlan){

updateData.mentorActionPlan = mentorActionPlan;

}









// ======================================
// UPDATE OLD DOCUMENT
// OR CREATE NEW
// ======================================


const report = await DepartmentFeedback.findOneAndUpdate(


{


studentId:student.studentId


},



updateData,



{


new:true,


upsert:true


}



);









return res.json({


success:true,


message:"Student progress updated successfully",


report


});






}


catch(error:any){



return res.status(500).json({

success:false,

message:error.message

});


}


};