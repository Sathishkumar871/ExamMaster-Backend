import { Request, Response } from "express";
import QuestionBank from "../models/questionModel";



// CREATE QUESTION
export const createQuestion = async (
  req: any,
  res: Response
): Promise<void> => {

  try {


    const teacher = req.teacher;



    const question = await QuestionBank.create({

      ...req.body,

      teacherId: teacher.teacherId,

      subject: teacher.subject

    });





    res.status(201).json({

      success:true,

      message:"Question created successfully",

      question

    });



  }
  catch(error:any){


    console.log(
      "CREATE QUESTION ERROR:",
      error
    );


    res.status(500).json({

      success:false,

      message:error.message

    });


  }

};









// GET ALL QUESTIONS
// ONLY OWN TEACHER QUESTIONS

export const getQuestions = async (

req:any,

res:Response

):Promise<void>=>{


try{


const teacher = req.teacher;



const questions =
await QuestionBank.find({

teacherId:teacher.teacherId

})

.sort({

createdAt:-1

});






res.json({

success:true,

total:questions.length,

questions

});





}
catch(error:any){


res.status(500).json({

success:false,

message:error.message

});


}



};












// GET SUBJECT QUESTIONS

export const getSubjectQuestions = async (

req:any,

res:Response

):Promise<void>=>{


try{


const teacher=req.teacher;



const {subject}=req.params;





// Teacher own subject only

if(subject !== teacher.subject){


res.status(403).json({

success:false,

message:"You cannot access this subject"

});


return;


}







const questions =
await QuestionBank.find({

subject,

teacherId:teacher.teacherId

});







res.json({

success:true,

total:questions.length,

questions

});




}
catch(error:any){


res.status(500).json({

success:false,

message:error.message

});


}


};











// UPDATE QUESTION

export const updateQuestion = async (

req:any,

res:Response

):Promise<void>=>{


try{


const teacher=req.teacher;




const updatedQuestion =

await QuestionBank.findOneAndUpdate(

{

_id:req.params.id,

teacherId:teacher.teacherId

},


req.body,


{

new:true,

runValidators:true

}


);








if(!updatedQuestion){


res.status(404).json({

success:false,

message:"Question not found or access denied"

});


return;


}







res.json({

success:true,

message:"Question updated successfully",

question:updatedQuestion

});







}
catch(error:any){


res.status(500).json({

success:false,

message:error.message

});


}


};












// DELETE QUESTION

export const deleteQuestion = async (

req:any,

res:Response

):Promise<void>=>{


try{


const teacher=req.teacher;





const deletedQuestion =

await QuestionBank.findOneAndDelete({

_id:req.params.id,

teacherId:teacher.teacherId

});






if(!deletedQuestion){


res.status(404).json({

success:false,

message:"Question not found or access denied"

});


return;


}







res.json({

success:true,

message:"Question deleted successfully"

});






}
catch(error:any){


res.status(500).json({

success:false,

message:error.message

});


}


};