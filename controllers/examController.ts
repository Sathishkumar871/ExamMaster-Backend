import { Request, Response } from "express";

import Exam from "../models/examModel";
import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";


// =====================================
// CREATE EXAM
// =====================================

export const createExam = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {
      title,
      subject,
      chapter,
      className,
      questions,
      duration,
      teacherId
    } = req.body;


    if (
      !title ||
      !subject ||
      !chapter ||
      !className ||
      !teacherId ||
      !questions ||
      questions.length === 0
    ) {

      return res.status(400).json({

        success:false,

        message:
        "Title, Subject, Chapter, ClassName, TeacherId and Questions required"

      });

    }


    const exam = await Exam.create({

      title,

      subject,

      chapter,

      className,


      questions,


      totalQuestions:
      questions.length,


      duration:
      duration || 180,


      createdBy:
      teacherId,


      status:
      "draft",


      isPublished:
      false

    });



    return res.status(201).json({

      success:true,

      message:
      "Exam created successfully",

      exam

    });


  } catch(error:any){


    console.log(
      "CREATE EXAM ERROR:",
      error
    );


    return res.status(500).json({

      success:false,

      message:error.message

    });

  }

};




// =====================================
// GET TEACHER EXAMS
// =====================================

export const getTeacherExams = async (
 req:Request,
 res:Response
):Promise<any>=>{


 try{


 const {
  teacherId
 } = req.query;



 if(!teacherId){

  return res.status(400).json({

   success:false,

   message:"TeacherId required"

  });

 }



 const exams =
 await Exam.find({

  createdBy:
  teacherId

 })
 .sort({

  createdAt:-1

 });



 return res.json({

  success:true,

  total:
  exams.length,

  exams

 });



 }catch(error:any){


 return res.status(500).json({

  success:false,

  message:error.message

 });


 }


};




// =====================================
// PUBLISH EXAM
// =====================================

export const publishExam = async (
 req:Request,
 res:Response
):Promise<any>=>{


try{


const exam =
await Exam.findByIdAndUpdate(

 req.params.id,


 {

  status:"published",

  isPublished:true

 },


 {

  new:true

 }

);



if(!exam){


 return res.status(404).json({

  success:false,

  message:"Exam not found"

 });


}



return res.json({

 success:true,

 message:
 "Exam published successfully",

 exam

});



}catch(error:any){


return res.status(500).json({

 success:false,

 message:error.message

});


}


};
// =====================================
// START EXAM
// =====================================

export const startExam = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {
      studentId,
      examId
    } = req.body;



    if (!studentId || !examId) {

      return res.status(400).json({

        success:false,

        message:
        "StudentId and ExamId required"

      });

    }



    const exam =
    await Exam.findById(examId);



    if(!exam){

      return res.status(404).json({

        success:false,

        message:
        "Exam not found"

      });

    }



    if(exam.status !== "published"){

      return res.status(400).json({

        success:false,

        message:
        "Exam is not published"

      });

    }



    const questions =
    await QuestionBank.find({

      _id:{
        $in:exam.questions
      }

    });



    if(questions.length===0){

      return res.status(404).json({

        success:false,

        message:
        "Questions not found"

      });

    }



    const session =
    await ExamSession.create({

      studentId,

      examId,

      questions:
      questions.map(
        (q:any)=>q._id
      ),

      answers:[],

      score:0,

      status:"started",

      startTime:
      new Date()

    });



    const displayQuestions =
    questions.map(
      (q:any)=>({

        questionId:q._id,

        questionNumber:
        q.questionNumber,

        question:
        q.question,


        options:
        q.options.sort(
          ()=>Math.random()-0.5
        ),


        subject:
        q.subject,


        chapter:
        q.chapter


      })

    );



    return res.status(200).json({

      success:true,

      message:
      "Exam Started",


      sessionId:
      session._id,


      exam:{


        id:
        exam._id,


        title:
        exam.title,


        subject:
        exam.subject,


        chapter:
        exam.chapter,


        duration:
        exam.duration,


        totalQuestions:
        exam.totalQuestions


      },


      questions:
      displayQuestions


    });



  }catch(error:any){


    console.log(
      "START EXAM ERROR:",
      error
    );


    return res.status(500).json({

      success:false,

      message:error.message

    });


  }

};





// =====================================
// SUBMIT EXAM
// =====================================

export const submitExam = async (
 req:Request,
 res:Response
):Promise<any>=>{


try{


const {

 studentId,

 studentName,

 sessionId,

 answers,

 warnings,

 timeTaken


}=req.body;



if(
 !studentId ||
 !sessionId ||
 !answers
){


return res.status(400).json({

 success:false,

 message:
 "StudentId, SessionId and Answers required"

});


}




const session =
await ExamSession.findById(sessionId);



if(!session){


return res.status(404).json({

 success:false,

 message:
 "Exam session not found"

});


}




if(session.status==="completed"){


return res.status(400).json({

 success:false,

 message:
 "Exam already submitted"

});


}




const exam =
await Exam.findById(
 session.examId
);



let correctAnswers=0;

let wrongAnswers=0;

let attemptedQuestions=0;

let unansweredQuestions=0;



const review:any[]=[];



for(const item of answers){


const question =
await QuestionBank.findById(
 item.questionId
);



if(!question)
continue;



if(
 !item.answer ||
 item.answer === ""
){

 unansweredQuestions++;

}else{

 attemptedQuestions++;

}



const isCorrect =
question.correctAnswer === item.answer;



if(isCorrect){

 correctAnswers++;

}else{

 wrongAnswers++;

}



review.push({

 questionId:
 question._id,


 question:
 question.question,


 selectedAnswer:
 item.answer || "",


 correctAnswer:
 question.correctAnswer,


 isCorrect


});


}



const totalQuestions =
exam?.totalQuestions ||
answers.length;



const marks =
correctAnswers;



const percentage =
Number(
(
(marks / totalQuestions) * 100
).toFixed(2)
);



let grade="F";


if(percentage>=90)
grade="A+";

else if(percentage>=80)
grade="A";

else if(percentage>=70)
grade="B";

else if(percentage>=60)
grade="C";

else if(percentage>=50)
grade="D";



const resultStatus =
percentage>=40
?
"PASS"
:
"FAIL";




const result =
await Result.create({


studentId,


studentName:
studentName || "",


examId:
session.examId,


examName:
exam?.title || "Exam",


subject:
exam?.subject || "General",


totalQuestions,


attemptedQuestions,


unansweredQuestions,


correctAnswers,


wrongAnswers,


marks,


percentage,


grade,


status:
resultStatus,


timeTaken:
timeTaken || 0,


warnings:
warnings || 0,


rank:0,


review


});




session.answers =
answers;


session.score =
marks;


session.status =
"completed";


session.endTime =
new Date();



await session.save();



return res.status(201).json({

 success:true,

 message:
 "Exam submitted successfully",

 result

});



}catch(error:any){


console.log(
"SUBMIT EXAM ERROR:",
error
);


return res.status(500).json({

 success:false,

 message:error.message

});


}


};