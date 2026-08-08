import { Request, Response } from "express";

import Result from "../models/Result";
import DailyTest from "../models/DailyTest";




// ===============================
// SUBMIT EXAM RESULT
// ===============================

export const submitResult = async (
  req: Request,
  res: Response
) => {

  try {


    const {

      studentId,

      studentName,

      examId,

      answers,

      timeTaken,

      warnings

    } = req.body;





    const test = await DailyTest.findById(
      examId
    );




    if(!test){

      return res.status(404).json({

        success:false,

        message:"Exam not found"

      });

    }






    let correctAnswers = 0;

    let wrongAnswers = 0;

    let review:any[] = [];







    test.questions.forEach(

      (question:any,index:number)=>{


        const selectedAnswer =
        answers[index];



        const isCorrect =
        selectedAnswer === question.correctAnswer;




        if(isCorrect){

          correctAnswers++;

        }

        else if(selectedAnswer){

          wrongAnswers++;

        }






        review.push({

          questionId:question._id,

          question:question.question,

          selectedAnswer:
          selectedAnswer || "",

          correctAnswer:
          question.correctAnswer,

          isCorrect

        });



      }

    );









    const totalQuestions =
    test.questions.length;



    const attemptedQuestions =
    correctAnswers + wrongAnswers;



    const unansweredQuestions =
    totalQuestions - attemptedQuestions;









    // NEET MARKING

    const marks =

    (correctAnswers * 4)

    -

    (wrongAnswers * 1);









    const percentage =

    Number(

      (

        (

          marks /

          (totalQuestions * 4)

        )

        *

        100

      ).toFixed(2)

    );








    let grade = "F";


    // FIXED TYPESCRIPT TYPE

    let status: "PASS" | "FAIL" = "FAIL";







    if(percentage >= 90){

      grade="A+";

      status="PASS";

    }

    else if(percentage >= 75){

      grade="A";

      status="PASS";

    }

    else if(percentage >= 60){

      grade="B";

      status="PASS";

    }

    else if(percentage >= 50){

      grade="C";

      status="PASS";

    }









    const result = await Result.create({

      studentId,

      studentName,

      examId,

      examName:test.title,

      subject:test.subject,

      totalQuestions,

      attemptedQuestions,

      unansweredQuestions,

      correctAnswers,

      wrongAnswers,

      marks,

      percentage,

      grade,

      status,

      timeTaken,

      warnings:warnings || 0,

      review

    });








    return res.status(201).json({

      success:true,

      message:"Exam Submitted Successfully",

      result

    });





  }

  catch(error:any){


    return res.status(500).json({

      success:false,

      message:error.message

    });


  }


};









// ===============================
// GET ALL RESULTS OF STUDENT
// ===============================

export const getStudentResults = async(
req:Request,
res:Response
)=>{


try{


const {studentId}=req.params;


const results = await Result.find({

studentId

})

.sort({

createdAt:-1

});





res.status(200).json({

success:true,

count:results.length,

results

});



}

catch(error:any){

res.status(500).json({

success:false,

message:error.message

});

}


};









// ===============================
// GET SINGLE RESULT
// ===============================

export const getSingleResult = async(
req:Request,
res:Response
)=>{


try{


const result = await Result.findById(

req.params.id

);





if(!result){

return res.status(404).json({

success:false,

message:"Result not found"

});

}





res.json({

success:true,

result

});





}

catch(error:any){

res.status(500).json({

success:false,

message:error.message

});

}


};









// ===============================
// GET LATEST RESULT
// ===============================

export const getLatestResult = async(
req:Request,
res:Response
)=>{


try{


const result = await Result.findOne({

studentId:req.params.studentId

})

.sort({

createdAt:-1

});





if(!result){

return res.status(404).json({

success:false,

message:"No Result Found"

});

}





res.json({

success:true,

result

});





}

catch(error:any){

res.status(500).json({

success:false,

message:error.message

});

}


};









// ===============================
// TOP RESULTS
// ===============================

export const getTopResults = async(
req:Request,
res:Response
)=>{


try{


const results = await Result.find()

.sort({

marks:-1,

percentage:-1

})

.limit(20);





res.json({

success:true,

results

});





}

catch(error:any){

res.status(500).json({

success:false,

message:error.message

});

}


};









// ===============================
// SUBJECT RESULTS
// ===============================

export const getSubjectResults = async(
req:Request,
res:Response
)=>{


try{


const results = await Result.find({

subject:req.params.subject

});





res.json({

success:true,

count:results.length,

results

});





}

catch(error:any){

res.status(500).json({

success:false,

message:error.message

});

}


};