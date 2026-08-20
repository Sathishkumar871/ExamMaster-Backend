import { Request, Response } from "express";
import Question from "../models/questionModel";
import Result from "../models/resultModel"; // పైనే ఇంపోర్ట్ చేసాము
import { parseQuestions } from "../services/pdfQuestionParser";
import pdfParse from "pdf-parse";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// ============================================================
// 1. GET ALL QUESTIONS
// ============================================================

export const getAllQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const questions = await Question.find({}).sort({
      globalQuestionNumber: 1,
    });

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("GET ALL QUESTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 2. GET PUBLISHED QUESTIONS
// ============================================================

export const getPublishedQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const questions = await Question.find({
      isPublished: true,
    }).sort({
      globalQuestionNumber: 1,
    });

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("GET PUBLISHED QUESTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 3. GET STUDENT QUESTIONS
// ============================================================

export const getStudentQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      subject,
      testCategory,
      className,
      academicYear,
      examType,
    } = req.query;

    const targetClass = className || academicYear;

    const query: any = {
      isPublished: true,
    };

    if (subject && subject !== "All") {
      query.subject = subject;
    }

    if (testCategory && testCategory !== "All") {
      query.testCategory = testCategory;
    }

    if (targetClass && targetClass !== "All") {
      query.className = targetClass;
    }

    if (examType && examType !== "All") {
      query.examType = examType;
    }

    const questions = await Question.find(query).sort({
      globalQuestionNumber: 1,
    });

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("GET STUDENT QUESTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 4. CREATE QUESTION MANUALLY
// ============================================================

export const createQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bodyData: any = {
      ...req.body,
    };

    if (bodyData.academicYear && !bodyData.className) {
      bodyData.className = bodyData.academicYear;
    }

    delete bodyData.academicYear;

    bodyData.isPublished = req.body.isPublished ?? false;
    bodyData.status = req.body.status || "pending";
    bodyData.sourceType = req.body.sourceType || "manual";
    bodyData.aiGenerated = req.body.aiGenerated ?? false;
    bodyData.aiVerified = req.body.aiVerified ?? false;
    bodyData.aiStatus = req.body.aiStatus || "not_checked";
    bodyData.pdfId = req.body.pdfId || "manual";
    bodyData.pdfSourceUrl = req.body.pdfSourceUrl || "";
    bodyData.testId = req.body.testId || `MANUAL-${Date.now()}`;
    bodyData.totalQuestions = Number(req.body.totalQuestions || 0);

    const newQuestion = new Question(bodyData);
    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: "Question added successfully as Draft!",
      question: newQuestion,
    });
  } catch (error: any) {
    console.error("CREATE QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 5. UPDATE QUESTION
// ============================================================

export const updateQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updateData: any = {
      ...req.body,
    };

    if (updateData.academicYear && !updateData.className) {
      updateData.className = updateData.academicYear;
    }

    delete updateData.academicYear;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedQuestion) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully!",
      question: updatedQuestion,
    });
  } catch (error: any) {
    console.error("UPDATE QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 6. DELETE QUESTION BY ID
// ============================================================

export const deleteQuestionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(
      req.params.id
    );

    if (!deletedQuestion) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question deleted successfully!",
    });
  } catch (error: any) {
    console.error("DELETE QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 7. PDF PARSE + CLOUDINARY + SAVE AS DRAFT
// ============================================================

export const parseAndSavePdfQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const file = req.file;

  try {
    if (!file) {
      res.status(400).json({
        success: false,
        message: "Please upload a PDF file!",
      });
      return;
    }

    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await (pdfParse as any)(dataBuffer);
    const rawText = pdfData.text || "";

    if (!rawText.trim()) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(400).json({
        success: false,
        message: "PDF contains no readable text.",
      });
      return;
    }

    const parsedQuestions = parseQuestions(rawText);

    if (!parsedQuestions || parsedQuestions.length === 0) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(400).json({
        success: false,
        message: "Could not extract any valid MCQ questions from the PDF.",
      });
      return;
    }

    const examType = req.body.examType || "JEE";
    const testCategory = req.body.testCategory || "mock";
    const className = req.body.className || req.body.academicYear || "1st PUC";
    const testTitle = req.body.testTitle || file.originalname.replace(/\.pdf$/i, "");
    const teacherId = req.body.teacherId || "HEAD";
    const testId = req.body.testId || `PDF-${Date.now()}`;
    const pdfId = `PDF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const cloudinaryResponse = await cloudinary.uploader.upload(file.path, {
      resource_type: "raw",
      folder: "pdf_question_banks",
    });

    const pdfSourceUrl = cloudinaryResponse.secure_url;

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const questionsToInsert = parsedQuestions.map((q: any) => ({
      questionNumber: q.questionNumber,
      subjectQuestionNumber: q.subjectQuestionNumber || 0,
      globalQuestionNumber: q.globalQuestionNumber || 0,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer || "",
      ansNumber: q.ansNumber || "",
      questionType: "MCQ",
      subject: q.subject,
      chapter: q.chapter || "",
      subjectOrder: q.subjectOrder || 1,
      testCategory,
      examType,
      className,
      testTitle,
      testId,
      totalQuestions: parsedQuestions.length,
      marksPerQuestion: Number(req.body.marksPerQuestion || 4),
      negativeMarks: Number(req.body.negativeMarks || 1),
      durationMinutes: Number(req.body.durationMinutes || 180),
      testDate: req.body.testDate || "",
      testTime: req.body.testTime || "",
      teacherId,
      pdfId,
      pdfSourceUrl,
      status: "pending",
      isAnswerCompleted: Boolean(q.correctAnswer),
      isPublished: false,
      examTags: Array.isArray(req.body.examTags) ? req.body.examTags : [],
      targetExamLevel: req.body.targetExamLevel || examType,
      aiGenerated: false,
      aiVerified: false,
      aiStatus: "not_checked",
      aiIssues: [],
      aiExplanation: "",
      sourceType: "pdf",
    }));

    const savedQuestions = await Question.insertMany(questionsToInsert);

    res.status(200).json({
      success: true,
      message: `Successfully parsed ${savedQuestions.length} questions and saved them as Draft!`,
      count: savedQuestions.length,
      testId,
      pdfId,
      pdfSourceUrl,
      examType,
      testCategory,
      className,
      testTitle,
      questions: savedQuestions,
    });
  } catch (error: any) {
    console.error("PDF PARSE & SAVE ERROR:", error);
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process PDF",
    });
  }
};

// ============================================================
// 8. PUBLISH ALL QUESTIONS
// ============================================================

export const publishAllQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await Question.updateMany(
      {},
      {
        $set: {
          isPublished: true,
          status: "published",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Successfully published all questions!",
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUBLISH ALL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 9. DELETE ALL QUESTIONS
// ============================================================

export const deleteAllQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await Question.deleteMany({});

    res.status(200).json({
      success: true,
      message: "All questions deleted successfully from Question Bank!",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("DELETE ALL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 10. GET QUESTIONS BY CATEGORY
// ============================================================

export const getQuestionsByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params;
    const { subject, className, academicYear, examType } = req.query;
    const targetClass = className || academicYear;

    const query: any = {
      testCategory: category,
      isPublished: true,
    };

    if (subject && subject !== "All") {
      query.subject = subject;
    }
    if (targetClass && targetClass !== "All") {
      query.className = targetClass;
    }
    if (examType && examType !== "All") {
      query.examType = examType;
    }

    const questions = await Question.find(query).sort({
      globalQuestionNumber: 1,
    });

    res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("GET CATEGORY QUESTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// 11. SUBMIT TEST & CALCULATE RESULTS (For Profile Dashboard)
// ============================================================

export const submitTestResult = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, studentName, testId, answers, timeTaken, testCategory } = req.body;

    if (!studentId || !testId || !answers) {
      res.status(400).json({
        success: false,
        message: "StudentId, testId, and answers are required",
      });
      return;
    }

    const questions = await Question.find({ testId });

    if (!questions || questions.length === 0) {
      res.status(404).json({
        success: false,
        message: "Test questions not found for this testId",
      });
      return;
    }

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unansweredQuestions = 0;
    const review: any[] = [];

    questions.forEach((question: any) => {
      const selectedAnswer = answers[question._id] || answers[question.questionNumber] || "";

      const isAnswered = selectedAnswer.trim() !== "";
      const isCorrect = isAnswered && selectedAnswer === question.correctAnswer;

      if (!isAnswered) {
        unansweredQuestions++;
      } else if (isCorrect) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }

      review.push({
        questionId: question._id,
        question: question.question,
        selectedAnswer: selectedAnswer || "Not Attempted",
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation || ""
      });
    });

    const totalQuestions = questions.length;
    const attemptedQuestions = correctAnswers + wrongAnswers;

    const marks = (correctAnswers * 4) - (wrongAnswers * 1);
    const negativeMarks = wrongAnswers * 1;
    const maxMarks = totalQuestions * 4;
    const percentage = maxMarks > 0 ? Number(((marks / maxMarks) * 100).toFixed(2)) : 0;

    let grade = "F";
    let status: "PASS" | "FAIL" = "FAIL";

    if (percentage >= 90) { grade = "A+"; status = "PASS"; }
    else if (percentage >= 75) { grade = "A"; status = "PASS"; }
    else if (percentage >= 60) { grade = "B"; status = "PASS"; }
    else if (percentage >= 40) { grade = "C"; status = "PASS"; }

    const testTitle = questions[0].testTitle || "Exam Test";
    const subject = questions[0].subject || "General";
    const category = testCategory || questions[0].testCategory || "daily";

    // పైన ఇంపోర్ట్ చేసిన 'Result' మోడల్‌ను ఇక్కడ వాడాము
    const savedResult = await Result.create({
      studentId,
      studentName: studentName || "Student",
      examId: testId,
      examName: testTitle,
      testCategory: category,
      subject,
      totalQuestions,
      attemptedQuestions,
      unansweredQuestions,
      correctAnswers,
      wrongAnswers,
      negativeMarks,
      marks,
      percentage,
      grade,
      status,
      timeTaken: timeTaken || 0,
      review
    });

    res.status(201).json({
      success: true,
      message: "Test submitted successfully and saved to history!",
      result: savedResult,
    });

  } catch (error: any) {
    console.error("SUBMIT TEST RESULT ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit test",
    });
  }
};