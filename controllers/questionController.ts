import { Response } from "express";
import QuestionBank from "../models/questionModel";
import { v2 as cloudinary } from "cloudinary";
import { UploadedFile } from "express-fileupload";
import { PDFParse } from "pdf-parse";
import { parseQuestions } from "../services/pdfQuestionParser";
import fs from "fs";

// Escape Regex for safe search
const escapeRegex = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// ==============================
// 1. CREATE QUESTION (With Image & TestType Support)
// ==============================
export const createQuestion = async (req: any, res: Response): Promise<void> => {
  try {
    const head = req.head;
    let imageUrl = req.body.imageUrl || "";

    // ఇమేజ్ అప్‌లోడ్ చేస్తే క్లౌడినరీకి పంపడం
    if (req.files && req.files.image) {
      const imageFile = req.files.image as UploadedFile;
      const upload = await cloudinary.uploader.upload(imageFile.tempFilePath, {
        folder: "question_images",
      });
      imageUrl = upload.secure_url;
    }

    const question = await QuestionBank.create({
      ...req.body,
      imageUrl,
      teacherId: head?.headId || head?._id || "HEAD",
      subject: req.body.subject || "General",
      testType: req.body.testType || "subject", // 'subject', 'mock', లేదా 'daily'
      testTitle: req.body.testTitle || req.body.chapter || "General Test",
      targetExamLevel: req.body.targetExamLevel || "board",
      isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true,
    });

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      question,
    });
  } catch (error: any) {
    console.log("CREATE QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 2. GET ALL QUESTIONS (Filtered by Subject, Chapter & TestType - For Staff/Admin)
// ==============================
export const getQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const { subject, chapter, testType } = req.query;
    const filter: any = {};

    if (subject && subject !== "All" && subject !== "undefined") {
      filter.subject = { $regex: new RegExp(`^${escapeRegex(subject.trim())}$`, "i") };
    }

    if (chapter && chapter !== "All" && chapter !== "undefined") {
      filter.chapter = { $regex: new RegExp(`^${escapeRegex(chapter.trim())}$`, "i") };
    }

    // టెస్ట్ టైప్ ఫిల్టర్ (Mock / Daily / Subject)
    if (testType && testType !== "undefined") {
      filter.testType = testType;
    }

    const questions = await QuestionBank.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.log("GET QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 3. GET QUESTIONS FOR STUDENTS (Only Published Questions)
// ==============================
export const getStudentQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    const { subject, chapter, testType } = req.query;
    
    // స్టూడెంట్స్‌కి కేవలం పబ్లిష్ అయిన క్వశ్చన్స్ మాత్రమే కనిపించాలి
    const filter: any = { isPublished: true };

    if (subject && subject !== "All" && subject !== "undefined") {
      filter.subject = { $regex: new RegExp(`^${escapeRegex(subject.trim())}$`, "i") };
    }

    if (chapter && chapter !== "All" && chapter !== "undefined") {
      filter.chapter = { $regex: new RegExp(`^${escapeRegex(chapter.trim())}$`, "i") };
    }

    if (testType && testType !== "undefined") {
      filter.testType = testType;
    }

    const questions = await QuestionBank.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.log("GET STUDENT QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 4. UPDATE QUESTION (Fixed Options Parsing & MongoDB Sync)
// ==============================
export const updateQuestion = async (req: any, res: Response): Promise<void> => {
  try {
    let updateData = { ...req.body };

    // 🛠️ FormData నుండి వచ్చే options స్ట్రింగ్‌గా ఉంటే వాటిని Array లాగా మార్చడం
    if (updateData.options && typeof updateData.options === "string") {
      try {
        updateData.options = JSON.parse(updateData.options);
      } catch (err) {
        console.log("Options parse error:", err);
      }
    }

    // కొత్త ఇమేజ్ ఏమైనా అప్లోడ్ చేస్తే అప్‌డేట్ చేయడం
    if (req.files && req.files.image) {
      const imageFile = req.files.image as UploadedFile;
      const upload = await cloudinary.uploader.upload(imageFile.tempFilePath, {
        folder: "question_images",
      });
      updateData.imageUrl = upload.secure_url;
    }

    const question = await QuestionBank.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        returnDocument: 'after', 
        runValidators: true,
      }
    );

    if (!question) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    res.json({
      success: true,
      message: "Question updated successfully in MongoDB",
      question,
    });
  } catch (error: any) {
    console.log("UPDATE QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 5. DELETE SINGLE QUESTION
// ==============================
export const deleteQuestion = async (req: any, res: Response): Promise<void> => {
  try {
    const deleted = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }
    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error: any) {
    console.log("DELETE QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 6. DELETE ALL QUESTIONS
// ==============================
export const deleteAllQuestions = async (req: any, res: Response): Promise<void> => {
  try {
    await QuestionBank.deleteMany({});
    res.json({ success: true, message: "All questions deleted successfully" });
  } catch (error: any) {
    console.log("DELETE ALL QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// 7. GENERATE QUESTIONS FROM PDF
// ==============================
export const generateQuestionsFromPDF = async (req: any, res: Response): Promise<void> => {
  let parser: PDFParse | null = null;
  try {
    const head = req.head;
    if (!req.files || !req.files.pdf) {
      res.status(400).json({ success: false, message: "PDF file required" });
      return;
    }

    const pdfFile = req.files.pdf as UploadedFile;
    const pdfBuffer = fs.readFileSync(pdfFile.tempFilePath);

    parser = new PDFParse({ data: pdfBuffer });
    const pdfData = await parser.getText();
    const extractedText = pdfData.text || "";

    if (!extractedText || extractedText.trim().length === 0) {
      res.status(400).json({ success: false, message: "PDF text not found" });
      return;
    }

    const parsedQuestions = parseQuestions(extractedText);
    if (parsedQuestions.length === 0) {
      res.status(400).json({ success: false, message: "No questions detected in PDF" });
      return;
    }

    const pdfId = Date.now().toString();
    let pdfUrl = "";
    try {
      const upload = await cloudinary.uploader.upload(pdfFile.tempFilePath, {
        resource_type: "raw",
        folder: "question_pdfs",
      });
      pdfUrl = upload.secure_url;
    } catch (err) {
      console.log("PDF Cloudinary upload error:", err);
    }

    const questionsToSave = parsedQuestions.map((q: any, index: number) => ({
      questionNumber: q.questionNumber || index + 1,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer || "",
      ansNumber: q.ansNumber || "",
      questionType: q.questionType || "MCQ",
      subject: req.body.subject || "General",
      chapter: req.body.chapter || "General",
      testType: req.body.testType || "subject", 
      testTitle: req.body.testTitle || "Untitled Test",
      targetExamLevel: req.body.targetExamLevel || "neet",
      teacherId: head?.headId || head?._id || "HEAD",
      pdfId,
      pdfSourceUrl: pdfUrl,
      status: "pending",
      isPublished: true, // ఇక్కడ బైడిఫాల్ట్ true ఉంటుంది కాబట్టి స్టూడెంట్స్ పేజీలో కనిపిస్తాయి
    }));

    const savedQuestions = await QuestionBank.insertMany(questionsToSave, { ordered: false });

    res.status(201).json({
      success: true,
      message: "PDF parsed and saved successfully",
      totalQuestions: savedQuestions.length,
      questions: savedQuestions,
    });
  } catch (error: any) {
    console.error("PDF ERROR:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed" });
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch (e) {}
    }
  }
};