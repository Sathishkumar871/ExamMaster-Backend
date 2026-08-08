import { Router, Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import pdfParse from "pdf-parse";
import axios from "axios";
import mongoose from "mongoose";
import { UploadedFile } from "express-fileupload";

import QuestionBank from "../models/questionModel";
import { parseQuestions } from "../services/pdfQuestionParser";

const router = Router();


// ==============================
// Cloudinary Config
// ==============================

cloudinary.config({

  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,

});



// ==============================
// Generate Questions From PDF
// ==============================

router.post(
  "/generate-from-pdf",

  async (req: Request, res: Response): Promise<any> => {

    try {


      // ==============================
      // Check PDF
      // ==============================


      if (!req.files || !req.files.pdf) {

        return res.status(400).json({

          success:false,

          message:"Please upload PDF",

        });

      }



      const pdfFile = req.files.pdf as UploadedFile;



      // ==============================
      // Upload Source
      // ==============================


      let uploadSource:any = pdfFile.tempFilePath;


      if (!uploadSource && pdfFile.data) {


        uploadSource = `data:${
          pdfFile.mimetype || "application/pdf"
        };base64,${pdfFile.data.toString("base64")}`;


      }




      // ==============================
      // Upload PDF To Cloudinary
      // ==============================


      const upload = await cloudinary.uploader.upload(

        uploadSource,

        {

          resource_type:"auto",

          folder:"question_pdfs",

        }

      );



      const pdfUrl = upload.secure_url;




      // ==============================
      // PDF ID
      // ==============================


      const pdfId = new mongoose.Types.ObjectId().toString();





      // ==============================
      // Duplicate PDF Check
      // ==============================


      const existingPdf = await QuestionBank.findOne({

        pdfUrl:pdfUrl,

      });



      if(existingPdf){


        return res.status(400).json({

          success:false,

          message:"This PDF already uploaded",

        });


      }





      // ==============================
      // Download PDF
      // ==============================


      const pdfResponse = await axios.get(

        pdfUrl,

        {

          responseType:"arraybuffer",

        }

      );






      // ==============================
      // Parse PDF Text
      // ==============================


      const pdfData = await (pdfParse as any)(

        pdfResponse.data

      );



      const extractedText = pdfData.text;




      if(
        !extractedText ||
        extractedText.trim().length === 0
      ){

        return res.status(400).json({

          success:false,

          message:"PDF text not found",

        });


      }







      // ==============================
      // Extract Questions
      // ==============================


      const parsedQuestions = parseQuestions(

        extractedText

      );





      if(parsedQuestions.length === 0){


        return res.status(400).json({

          success:false,

          message:"Questions not detected",

        });


      }





      console.log(

        "Questions Found:",

        parsedQuestions.length

      );






      // ==============================
      // Get Details
      // ==============================


      const {

        subject,

        chapter,

        teacherId,


      } = req.body;







      // ==============================
      // Prepare Questions
      // ==============================


      const questionsToSave = parsedQuestions.map(

        (q:any)=>({


          question:q.question,


          options:q.options,


          correctAnswer:q.correctAnswer,


          subject:subject || "General",


          chapter:chapter || "General",


          teacherId:teacherId,


          pdfId:pdfId,


          pdfUrl:pdfUrl,


        })

      );







      // ==============================
      // Save Questions
      // ==============================


      const savedQuestions = await QuestionBank.insertMany(

        questionsToSave

      );







      // ==============================
      // Response
      // ==============================


      return res.status(201).json({

        success:true,


        message:
        "Questions generated and saved successfully",


        pdfId,


        subject,


        chapter,


        teacherId,


        totalQuestions:
        savedQuestions.length,


        questions:
        savedQuestions,


      });






    }

    catch(err:any){


      console.log(err);


      return res.status(500).json({

        success:false,

        message:err.message,

      });


    }


  }

);



export default router;