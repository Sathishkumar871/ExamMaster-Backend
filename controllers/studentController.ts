import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Staff from "../models/Staff";
import Student from "../models/Student";
import Teacher from "../models/Teacher";
import Result from "../models/Result";
const generateStudentId = () => {

  return (
    "STU" +
    Math.floor(
      100000 + Math.random() * 900000
    )
  );

};



// =====================================
// REGISTER STUDENT
// =====================================

export const registerStudent = async (
  req: Request,
  res: Response
) => {

  try {

    const {

      name,
      email,
      password,

      classId,
      className,

      year,
      section

    } = req.body;



    if (

      !name ||
      !email ||
      !password ||
      !classId ||
      !className ||
      !year ||
      !section

    ) {

      return res.status(400).json({

        success:false,

        message:"All fields required"

      });

    }




    const existStudent =
      await Student.findOne({
        email
      });



    if(existStudent){

      return res.status(400).json({

        success:false,

        message:"Student already exists"

      });

    }




    // FIND MENTOR BASED ON CLASS + SECTION


    const studentId =
      generateStudentId();




    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );





    const student =
      await Student.create({

        name,

        studentId,

        email,

        password:hashedPassword,


        classId,

        className,


        year,

        section,


        


      });





    return res.status(201).json({

      success:true,

      message:"Register Success",


      student:{

        name:student.name,

        studentId:student.studentId,

        email:student.email,


        classId:student.classId,

        className:student.className,


        year:student.year,

        section:student.section,


        
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





// =====================================
// LOGIN STUDENT
// =====================================

export const loginStudent = async (

  req:Request,

  res:Response

)=>{


try{


const {
 email,
 password
}=req.body;



if(!email || !password){

return res.status(400).json({

success:false,

message:"Email and Password required"

});

}



const student =
await Student.findOne({
 email
});




if(!student){

return res.status(404).json({

success:false,

message:"Student not found"

});

}




const match =
await bcrypt.compare(
 password,
 student.password
);




if(!match){

return res.status(401).json({

success:false,

message:"Wrong password"

});

}





const token =
jwt.sign(

{

 id:student._id,


 studentId:student.studentId,



 name:student.name,


 email:student.email,


 classId:student.classId,


 className:student.className,


 year:student.year,


 section:student.section,


 role:"student"


},


process.env.JWT_SECRET as string,


{

 expiresIn:"7d"

}


);





return res.json({

success:true,

message:"Login Success",

token,

student: {
  name: student.name,
  email: student.email,
  studentId: student.studentId,
  
  classId: student.classId,
  className: student.className,
  year: student.year,
  section: student.section
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





// =====================================
// GET STUDENT PROFILE
// =====================================

export const getStudentProfile = async (

req:any,

res:Response

)=>{


try{


const {
studentId
}=req.params;



const student =
await Student.findOne({
studentId
});



if(!student){

return res.status(404).json({

success:false,

message:"Student not found"

});

}




const results =
await Result.find({
studentId
})
.sort({
createdAt:-1
});




const totalExams =
results.length;




const totalMarks =
results.reduce(

(sum,item:any)=>
sum + (item.marks || 0),

0

);




const average =

totalExams > 0

?

Number(

(

results.reduce(

(sum,item:any)=>

sum + (item.percentage || 0),

0

)

/

totalExams

)

.toFixed(2)

)

:

0;





const correctAnswers =
results.reduce(

(sum,item:any)=>

sum + (item.correctAnswers || 0),

0

);




const wrongAnswers =
results.reduce(

(sum,item:any)=>

sum + (item.wrongAnswers || 0),

0

);





return res.json({

success:true,


student:{


name:student.name,


email:student.email,


studentId:student.studentId,





classId:student.classId,


className:student.className,


year:student.year,


section:student.section


},



performance:{


totalExams,


totalMarks,


average,


correctAnswers,


wrongAnswers


},



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