import { Router, Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import pdfParse from "pdf-parse";
import axios from "axios";
import mongoose from "mongoose";
import { UploadedFile } from "express-fileupload";

import QuestionBank from "../models/questionModel";

import { parseQuestions } from "../services/pdfQuestionParser";

import {
  analyzePDFWithGroq,
} from "../services/groqQuestionVerifier";

const router = Router();

// ============================================================
// CLOUDINARY CONFIG
// ============================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// GENERATE QUESTIONS FROM PDF
// ============================================================

router.post(
  "/generate-from-pdf",

  async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      // ========================================================
      // CHECK PDF
      // ========================================================

      if (
        !req.files ||
        !req.files.pdf
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please upload PDF",
        });
      }

      const pdfFile =
        req.files.pdf as UploadedFile;

      // ========================================================
      // UPLOAD SOURCE
      // ========================================================

      let uploadSource: any =
        pdfFile.tempFilePath;

      if (
        !uploadSource &&
        pdfFile.data
      ) {
        uploadSource =
          `data:${
            pdfFile.mimetype ||
            "application/pdf"
          };base64,${pdfFile.data.toString(
            "base64"
          )}`;
      }

      // ========================================================
      // UPLOAD PDF TO CLOUDINARY
      // ========================================================

      const upload =
        await cloudinary.uploader.upload(
          uploadSource,
          {
            resource_type: "auto",

            folder:
              "question_pdfs",
          }
        );

      const pdfUrl =
        upload.secure_url;

      // ========================================================
      // PDF ID
      // ========================================================

      const pdfId =
        new mongoose.Types.ObjectId().toString();

      // ========================================================
      // DUPLICATE PDF CHECK
      // ========================================================

      const existingPdf =
        await QuestionBank.findOne({
          pdfUrl: pdfUrl,
        });

      if (existingPdf) {
        return res.status(400).json({
          success: false,

          message:
            "This PDF already uploaded",
        });
      }

      // ========================================================
      // DOWNLOAD PDF
      // ========================================================

      const pdfResponse =
        await axios.get(
          pdfUrl,
          {
            responseType:
              "arraybuffer",
          }
        );

      // ========================================================
      // PDF PARSE
      // ========================================================

      console.log(
        "=========================================="
      );

      console.log(
        "📄 PDF PARSING STARTED"
      );

      console.log(
        "PDF SIZE:",
        pdfResponse.data.length
      );

      console.log(
        "=========================================="
      );

      const pdfData =
        await (pdfParse as any)(
          pdfResponse.data
        );

      const extractedText =
        pdfData.text;

      // ========================================================
      // CHECK EXTRACTED TEXT
      // ========================================================

      if (
        !extractedText ||
        extractedText.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "PDF text not found. This PDF may be scanned/image based.",
        });
      }

      console.log(
        "PDF TEXT LENGTH:",
        extractedText.length
      );

      console.log(
        "PDF TEXT PREVIEW:"
      );

      console.log(
        extractedText.substring(
          0,
          3000
        )
      );

      // ========================================================
      // LOCAL QUESTION PARSER
      // ========================================================

      console.log(
        "=========================================="
      );

      console.log(
        "📝 LOCAL QUESTION PARSER STARTED"
      );

      console.log(
        "=========================================="
      );

      const parsedQuestions =
        parseQuestions(
          extractedText
        );

      console.log(
        "LOCAL PARSER QUESTIONS:",
        parsedQuestions.length
      );

      // ========================================================
      // IF LOCAL PARSER FOUND NOTHING
      // ========================================================

      if (
        parsedQuestions.length === 0
      ) {
        console.log(
          "⚠️ LOCAL PARSER FOUND 0 QUESTIONS"
        );

        /*
          We are still sending the original
          extracted PDF text to Groq.

          This allows Groq to reconstruct
          questions even when regex parser
          misses some questions.
        */
      }

      // ========================================================
      // GROQ VERIFICATION
      // ========================================================

      console.log(
        "=========================================="
      );

      console.log(
        "🤖 GROQ PDF VERIFICATION STARTED"
      );

      console.log(
        "=========================================="
      );

      const verifiedQuestions =
        await analyzePDFWithGroq(
          extractedText,
          parsedQuestions
        );

      console.log(
        "=========================================="
      );

      console.log(
        "🤖 GROQ VERIFIED QUESTIONS:",
        verifiedQuestions.length
      );

      console.log(
        "=========================================="
      );

      // ========================================================
      // CHECK GROQ RESULT
      // ========================================================

      if (
        verifiedQuestions.length === 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "No valid questions could be extracted from this PDF.",
        });
      }

      // ========================================================
      // GET DETAILS
      // ========================================================

      const {
        subject,
        chapter,
        teacherId,
      } = req.body;

      // ========================================================
      // PREPARE QUESTIONS
      // ========================================================

      const questionsToSave =
        verifiedQuestions.map(
          (q: any) => ({
            question:
              q.question,

            options:
              q.options,

            correctAnswer:
              q.correctAnswer,

            subject:
              subject ||
              "General",

            chapter:
              chapter ||
              "General",

            teacherId:
              teacherId,

            pdfId:
              pdfId,

            pdfUrl:
              pdfUrl,
          })
        );

      // ========================================================
      // SAVE QUESTIONS
      // ========================================================

      console.log(
        "=========================================="
      );

      console.log(
        "💾 SAVING QUESTIONS TO DATABASE"
      );

      console.log(
        "QUESTIONS TO SAVE:",
        questionsToSave.length
      );

      console.log(
        "=========================================="
      );

      const savedQuestions =
        await QuestionBank.insertMany(
          questionsToSave
        );

      // ========================================================
      // FINAL RESPONSE
      // ========================================================

      return res.status(201).json({
        success: true,

        message:
          "Questions generated, verified and saved successfully",

        pdfId,

        subject,

        chapter,

        teacherId,

        totalQuestions:
          savedQuestions.length,

        questions:
          savedQuestions,
      });
    } catch (err: any) {
      console.error(
        "=========================================="
      );

      console.error(
        "❌ PDF QUESTION GENERATION ERROR"
      );

      console.error(err);

      console.error(
        "=========================================="
      );

      return res.status(500).json({
        success: false,

        message:
          err?.message ||
          "Failed to generate questions",
      });
    }
  }
);

export default router;

