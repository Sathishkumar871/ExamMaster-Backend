import { Request, Response } from "express";

import Result from "../models/Result";
import DailyTest from "../models/DailyTest";




// ======================================
// SUBMIT EXAM RESULT
// ======================================

export const submitExam = async (
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





    if (
      !studentId ||
      !examId ||
      !answers
    ) {


      return res.status(400).json({

        success:false,

        message:"Required fields missing"

      });


    }






    // GET EXAM

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

    let unansweredQuestions = 0;




    const review:any[] = [];







    test.questions.forEach(

      (question:any,index:number)=>{


        const selectedAnswer = answers[index];





        if(!selectedAnswer){


          unansweredQuestions++;


        }

        else if(

          selectedAnswer === question.correctAnswer

        ){


          correctAnswers++;


        }

        else{


          wrongAnswers++;


        }








        review.push({

          questionId:question._id,

          question:question.question,

          selectedAnswer:
          selectedAnswer || "Not Attempted",

          correctAnswer:
          question.correctAnswer,

          isCorrect:
          selectedAnswer === question.correctAnswer,

          explanation:
          question.explanation || ""

        });



      }

    );









    const totalQuestions =
    test.questions.length;





    const attemptedQuestions =
    correctAnswers + wrongAnswers;









    // NEET STYLE MARK CALCULATION

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


    // FIXED TYPE

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

    else if(percentage >= 40){


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


      message:"Exam submitted successfully",


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