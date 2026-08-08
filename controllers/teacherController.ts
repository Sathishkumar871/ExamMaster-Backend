import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import Result from "../models/Result";
import Teacher from "../models/Teacher";
import Student from "../models/Student";
import DepartmentFeedback from "../models/DepartmentFeedback";
export const teacherLogin = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      teacherId,
      accessCode
    } = req.body;


    if (!teacherId || !accessCode) {

      return res.status(400).json({
        success:false,
        message:"Teacher ID and Access Code required"
      });
    }
    const teacher = await Teacher.findOne({
      teacherId,
      accessCode
    });
    if (!teacher) {

      return res.status(404).json({
        success:false,
        message:"Invalid Teacher ID or Access Code"
      });
    }
    if (!teacher.isApproved) {

      return res.status(403).json({
        success:false,
        message:"Teacher not approved"
      });
    }
    const teacherType =
      teacher.teacherType || "teacher";
    const token = jwt.sign(
      {
        id:teacher._id,
        teacherId:teacher.teacherId,
        name:teacher.name,
        subject:teacher.subject,
        classIds:teacher.classIds,
        classNames:teacher.classNames,
        sections:teacher.sections,
        role: "teacher",
        teacherType

      },
      process.env.JWT_SECRET as string,
      {
        expiresIn:"7d"
      }
    );


    return res.json({

      success:true,

      message:"Teacher Login Success",

      token,


      redirect:
      teacherType==="mentor"
      ? "/mentor-dashboard"
      : "/teacher-dashboard",



      teacher:{

        id:teacher._id,

        teacherId:teacher.teacherId,

        name:teacher.name,

        classIds:teacher.classIds,

        classNames:teacher.classNames,

        sections:teacher.sections,

        subject:teacher.subject,

        teacherType

      }

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
// GET STUDENTS PERFORMANCE
// ======================================


export const getStudentsPerformance = async (

req:Request,

res:Response

)=>{


try{


const teacher:any=(req as any).teacher;



const students = await Student.find({
  classId:{
    $in: teacher.classIds
  },

  ...(teacher.sections.includes("ALL")
  ? {}
  : {
      section:{
        $in: teacher.sections
      }
    })

});

const studentIds =
students.map(
(student:any)=>student.studentId
);



const allResults =
await Result.find({

studentId:{
$in:studentIds
}

})
.sort({
createdAt:-1
});



const mentorFeedback =
await DepartmentFeedback.find({

studentId:{
$in:studentIds
}

})
.sort({
createdAt:-1
});



const studentData =
students.map((student:any)=>{


const results =
allResults.filter(

(item:any)=>
item.studentId===student.studentId

);



let totalPercentage=0;
let highestMarks=0;
let correctAnswers=0;
let wrongAnswers=0;
let pass=0;
let fail=0;



results.forEach((item:any)=>{


totalPercentage += item.percentage || 0;


correctAnswers += item.correctAnswers || 0;


wrongAnswers += item.wrongAnswers || 0;



if(item.marks > highestMarks){

highestMarks=item.marks;

}



if(item.status==="PASS"){

pass++;

}
else{

fail++;

}



});



return {

_id:student._id,

studentId:student.studentId,

name:student.name,

email:student.email,

classId:student.classId,

className:student.className,

section:student.section,

totalExams:results.length,


average:
results.length>0
?
Number(
(
totalPercentage/results.length
).toFixed(2)
)
:
0,


highestMarks,

correctAnswers,

wrongAnswers,

pass,

fail,

results


};


});




return res.json({

success:true,

students:studentData,

mentorFeedback

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
// TOP STUDENTS
// ======================================


export const getTopStudents = async (

req:Request,

res:Response

)=>{


try{


const teacher:any=(req as any).teacher;



const students =
await Student.find({

classId:{
$in:teacher.classIds
}

});



const studentIds =
students.map(
(s:any)=>s.studentId
);




const topStudents =
await Result.aggregate([


{

$match:{

studentId:{
$in:studentIds
}

}

},


{

$group:{

_id:"$studentId",

studentName:{
$first:"$studentName"
},

average:{
$avg:"$percentage"
}


}

},


{

$sort:{

average:-1

}

},


{

$limit:10

}


]);



return res.json({

success:true,

students:topStudents

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
// SUBJECT ANALYSIS
// ======================================


export const getSubjectAnalysis = async (

req:Request,

res:Response

)=>{


try{


const teacher:any=(req as any).teacher;



const students =
await Student.find({

classId:{
  $in: teacher.classIds
},

section:{
  $in: teacher.sections
}

});


const studentIds =
students.map(
(s:any)=>s.studentId
);




const data =
await Result.aggregate([


{

$match:{

studentId:{
$in:studentIds
}

}

},


{

$group:{

_id:"$subject",

averagePercentage:{
$avg:"$percentage"
},

totalAttempts:{
$sum:1
}


}

}


]);




return res.json({

success:true,

data

});


}
catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}

};