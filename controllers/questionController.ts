import { Response } from "express";
import QuestionBank from "../models/questionModel";

import { v2 as cloudinary } from "cloudinary";
import { UploadedFile } from "express-fileupload";
import { PDFParse } from "pdf-parse";

import { parseQuestions } from "../services/pdfQuestionParser";

import fs from "fs";

// ============================================================
// TYPES
// ============================================================

type TestCategory =
  | "mock"
  | "daily"
  | "subject";

type ExamType =
  | "NEET"
  | "JEE";

type AcademicYear =
  | "1st PUC"
  | "2nd PUC";

// ============================================================
// ESCAPE REGEX
// ============================================================

const escapeRegex = (text: string) => {

  return text.replace(
    /[-[\]{}()*+?.,\\^$|#\s]/g,
    "\\$&"
  );

};

// ============================================================
// SAFE BOOLEAN
// ============================================================

const parseBoolean = (
  value: any,
  defaultValue = true
): boolean => {

  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    normalized === "true"
  ) {
    return true;
  }

  if (
    normalized === "false"
  ) {
    return false;
  }

  return defaultValue;

};

// ============================================================
// NORMALIZE TEST CATEGORY
// ============================================================

const normalizeTestCategory = (
  value: any
): TestCategory => {

  const category =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    category === "mock"
  ) {
    return "mock";
  }

  if (
    category === "daily"
  ) {
    return "daily";
  }

  return "subject";

};

// ============================================================
// NORMALIZE EXAM TYPE
// ============================================================

const normalizeExamType = (
  value: any
): ExamType => {

  const exam =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    exam === "JEE"
  ) {
    return "JEE";
  }

  return "NEET";

};

// ============================================================
// NORMALIZE ACADEMIC YEAR
// ============================================================

const normalizeAcademicYear = (
  value: any
): AcademicYear => {

  const year =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    year === "2nd puc" ||
    year === "second puc" ||
    year === "2"
  ) {

    return "2nd PUC";

  }

  return "1st PUC";

};

// ============================================================
// SUBJECT FILTER
// ============================================================

const createSubjectFilter = (
  subject: any
) => {

  if (
    !subject ||
    subject === "All" ||
    subject === "undefined"
  ) {

    return undefined;

  }

  return {

    $regex: new RegExp(
      `^${escapeRegex(
        String(subject).trim()
      )}$`,
      "i"
    ),

  };

};

// ============================================================
// TITLE FILTER
// ============================================================

const createTitleFilter = (
  testTitle: any
) => {

  if (
    !testTitle ||
    testTitle === "All" ||
    testTitle === "undefined"
  ) {

    return undefined;

  }

  return {

    $regex: new RegExp(
      `^${escapeRegex(
        String(testTitle).trim()
      )}$`,
      "i"
    ),

  };

};

// ============================================================
// TEST ID FILTER
// ============================================================

const createTestIdFilter = (
  testId: any
) => {

  if (
    !testId ||
    testId === "All" ||
    testId === "undefined"
  ) {

    return undefined;

  }

  return {

    $regex: new RegExp(
      `^${escapeRegex(
        String(testId).trim()
      )}$`,
      "i"
    ),

  };

};

// ============================================================
// 1. CREATE QUESTION
// ============================================================

export const createQuestion = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    const head =
      req.head;

    // ========================================================
    // IMAGE
    // ========================================================

    let imageUrl =
      req.body.imageUrl || "";

    if (
      req.files &&
      req.files.image
    ) {

      const imageFile =
        req.files.image as UploadedFile;

      const upload =
        await cloudinary.uploader.upload(
          imageFile.tempFilePath,
          {
            folder:
              "question_images",
          }
        );

      imageUrl =
        upload.secure_url;

    }

    // ========================================================
    // BASIC VALUES
    // ========================================================

    const testCategory =
      normalizeTestCategory(
        req.body.testCategory
      );

    const examType =
      normalizeExamType(
        req.body.examType
      );

    const academicYear =
      normalizeAcademicYear(
        req.body.academicYear
      );

    const subject =
      String(
        req.body.subject ||
        "General"
      ).trim();

    const chapter =
      String(
        req.body.chapter ||
        ""
      ).trim();

    const testTitle =
      String(
        req.body.testTitle ||
        "Untitled Test"
      ).trim();

    // ========================================================
    // TEST ID
    // ========================================================

    const testId =
      String(
        req.body.testId ||
        `${examType}-${academicYear}-${testCategory}-${Date.now()}`
      ).trim();

    // ========================================================
    // TOTAL QUESTIONS
    // ========================================================

    let totalQuestions =
      Number(
        req.body.totalQuestions
      );

    if (
      !totalQuestions ||
      totalQuestions < 1
    ) {

      totalQuestions =
        testCategory === "subject"
          ? 100
          : 180;

    }

    // ========================================================
    // DATE / TIME
    // ========================================================

    const testDate =
      String(
        req.body.testDate ||
        ""
      ).trim();

    const testTime =
      String(
        req.body.testTime ||
        ""
      ).trim();

    // ========================================================
    // CREATE QUESTION
    // ========================================================

    const question =
      await QuestionBank.create({

        questionNumber:
          Number(
            req.body.questionNumber
          ) || 1,

        question:
          req.body.question ||
          "",

        options:
          Array.isArray(
            req.body.options
          )
            ? req.body.options
            : [],

        correctAnswer:
          req.body.correctAnswer ||
          "",

        ansNumber:
          req.body.ansNumber ||
          "",

        questionType:
          req.body.questionType ||
          "MCQ",

        chapter,

        subject,

        teacherId:
          head?.headId ||
          head?._id ||
          "HEAD",

        pdfId:
          req.body.pdfId ||
          "manual",

        pdfSourceUrl:
          req.body.pdfSourceUrl ||
          "",

        status:
          req.body.status ||
          "pending",

        isAnswerCompleted:
          Boolean(
            req.body.correctAnswer ||
            req.body.ansNumber
          ),

        examTags:
          Array.isArray(
            req.body.examTags
          )
            ? req.body.examTags
            : [],

        isPublished:
          parseBoolean(
            req.body.isPublished,
            true
          ),

        testCategory,

        examType,

        academicYear,

        testTitle,

        testId,

        totalQuestions,

        testDate,

        testTime,

        targetExamLevel:
          req.body.targetExamLevel ||
          "board",

        imageUrl,

      });

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({

      success: true,

      message:
        "Question created successfully",

      question,

    });

  } catch (error: any) {

    console.log(
      "CREATE QUESTION ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to create question",

    });

  }

};

// ============================================================
// 2. GET QUESTIONS
// ============================================================

export const getQuestions = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    const {
      subject,
      testCategory,
      examType,
      academicYear,
      testTitle,
      testId,
      chapter,
    } = req.query;

    const filter: any = {};

    // ========================================================
    // TEST CATEGORY
    // ========================================================

    if (
      testCategory &&
      testCategory !== "All" &&
      testCategory !== "undefined"
    ) {

      filter.testCategory =
        normalizeTestCategory(
          testCategory
        );

    }

    // ========================================================
    // EXAM TYPE
    // ========================================================

    if (
      examType &&
      examType !== "All" &&
      examType !== "undefined"
    ) {

      filter.examType =
        normalizeExamType(
          examType
        );

    }

    // ========================================================
    // ACADEMIC YEAR
    // ========================================================

    if (
      academicYear &&
      academicYear !== "All" &&
      academicYear !== "undefined"
    ) {

      filter.academicYear =
        normalizeAcademicYear(
          academicYear
        );

    }

    // ========================================================
    // TEST ID
    // ========================================================

    const testIdFilter =
      createTestIdFilter(
        testId
      );

    if (
      testIdFilter
    ) {

      filter.testId =
        testIdFilter;

    }

    // ========================================================
    // TEST TITLE
    // ========================================================

    const titleFilter =
      createTitleFilter(
        testTitle
      );

    if (
      titleFilter
    ) {

      filter.testTitle =
        titleFilter;

    }

    // ========================================================
    // SUBJECT
    // ========================================================

    const subjectFilter =
      createSubjectFilter(
        subject
      );

    if (
      subjectFilter
    ) {

      filter.subject =
        subjectFilter;

    }

    // ========================================================
    // CHAPTER
    // ========================================================

    if (
      chapter &&
      chapter !== "All" &&
      chapter !== "undefined"
    ) {

      filter.chapter = {

        $regex: new RegExp(
          `^${escapeRegex(
            String(chapter).trim()
          )}$`,
          "i"
        ),

      };

    }

    // ========================================================
    // DATABASE
    // ========================================================

    const questions =
      await QuestionBank.find(
        filter
      )
      .sort({
        questionNumber: 1,
        createdAt: 1,
      });

    // ========================================================
    // RESPONSE
    // ========================================================

    res.json({

      success: true,

      total:
        questions.length,

      filters: {

        testCategory:
          testCategory || null,

        examType:
          examType || null,

        academicYear:
          academicYear || null,

        testTitle:
          testTitle || null,

        testId:
          testId || null,

        subject:
          subject || null,

        chapter:
          chapter || null,

      },

      questions,

    });

  } catch (error: any) {

    console.log(
      "GET QUESTIONS ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to get questions",

    });

  }

};

// ============================================================
// 3. GET STUDENT QUESTIONS
// ============================================================

export const getStudentQuestions = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    const {
      subject,
      testCategory,
      examType,
      academicYear,
      testTitle,
      testId,
      chapter,
    } = req.query;

    // ========================================================
    // ONLY PUBLISHED
    // ========================================================

    const filter: any = {

      isPublished: true,

    };

    // ========================================================
    // TEST CATEGORY
    // ========================================================

    if (
      testCategory &&
      testCategory !== "All" &&
      testCategory !== "undefined"
    ) {

      filter.testCategory =
        normalizeTestCategory(
          testCategory
        );

    }

    // ========================================================
    // EXAM TYPE
    // ========================================================

    if (
      examType &&
      examType !== "All" &&
      examType !== "undefined"
    ) {

      filter.examType =
        normalizeExamType(
          examType
        );

    }

    // ========================================================
    // ACADEMIC YEAR
    // ========================================================

    if (
      academicYear &&
      academicYear !== "All" &&
      academicYear !== "undefined"
    ) {

      filter.academicYear =
        normalizeAcademicYear(
          academicYear
        );

    }

    // ========================================================
    // TEST ID
    // ========================================================

    const testIdFilter =
      createTestIdFilter(
        testId
      );

    if (
      testIdFilter
    ) {

      filter.testId =
        testIdFilter;

    }

    // ========================================================
    // TEST TITLE
    // ========================================================

    const titleFilter =
      createTitleFilter(
        testTitle
      );

    if (
      titleFilter
    ) {

      filter.testTitle =
        titleFilter;

    }

    // ========================================================
    // SUBJECT
    // ========================================================

    const subjectFilter =
      createSubjectFilter(
        subject
      );

    if (
      subjectFilter
    ) {

      filter.subject =
        subjectFilter;

    }

    // ========================================================
    // CHAPTER
    // ========================================================

    if (
      chapter &&
      chapter !== "All" &&
      chapter !== "undefined"
    ) {

      filter.chapter = {

        $regex: new RegExp(
          `^${escapeRegex(
            String(chapter).trim()
          )}$`,
          "i"
        ),

      };

    }

    // ========================================================
    // DATABASE
    // ========================================================

    const questions =
      await QuestionBank.find(
        filter
      )
      .sort({
        questionNumber: 1,
        createdAt: 1,
      });

    // ========================================================
    // RESPONSE
    // ========================================================

    res.json({

      success: true,

      total:
        questions.length,

      filters: {

        testCategory:
          testCategory || null,

        examType:
          examType || null,

        academicYear:
          academicYear || null,

        testTitle:
          testTitle || null,

        testId:
          testId || null,

        subject:
          subject || null,

        chapter:
          chapter || null,

      },

      questions,

    });

  } catch (error: any) {

    console.log(
      "GET STUDENT QUESTIONS ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to get student questions",

    });

  }

};

// ============================================================
// 4. UPDATE QUESTION
// ============================================================

export const updateQuestion = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    const updateData: any = {
      ...req.body,
    };

    // ========================================================
    // OPTIONS
    // ========================================================

    if (
      updateData.options &&
      typeof updateData.options ===
        "string"
    ) {

      try {

        updateData.options =
          JSON.parse(
            updateData.options
          );

      } catch (error) {

        console.log(
          "OPTIONS PARSE ERROR:",
          error
        );

        res.status(400).json({

          success: false,

          message:
            "Invalid options format",

        });

        return;

      }

    }

    // ========================================================
    // SUBJECT
    // ========================================================

    if (
      updateData.subject !==
      undefined
    ) {

      updateData.subject =
        String(
          updateData.subject
        ).trim();

    }

    // ========================================================
    // CHAPTER
    // ========================================================

    if (
      updateData.chapter !==
      undefined
    ) {

      updateData.chapter =
        String(
          updateData.chapter
        ).trim();

    }

    // ========================================================
    // TEST CATEGORY
    // ========================================================

    if (
      updateData.testCategory
    ) {

      updateData.testCategory =
        normalizeTestCategory(
          updateData.testCategory
        );

    }

    // ========================================================
    // EXAM TYPE
    // ========================================================

    if (
      updateData.examType
    ) {

      updateData.examType =
        normalizeExamType(
          updateData.examType
        );

    }

    // ========================================================
    // ACADEMIC YEAR
    // ========================================================

    if (
      updateData.academicYear
    ) {

      updateData.academicYear =
        normalizeAcademicYear(
          updateData.academicYear
        );

    }

    // ========================================================
    // TEST TITLE
    // ========================================================

    if (
      updateData.testTitle
    ) {

      updateData.testTitle =
        String(
          updateData.testTitle
        ).trim();

    }

    // ========================================================
    // TEST ID
    // ========================================================

    if (
      updateData.testId
    ) {

      updateData.testId =
        String(
          updateData.testId
        ).trim();

    }

    // ========================================================
    // TOTAL QUESTIONS
    // ========================================================

    if (
      updateData.totalQuestions !==
      undefined
    ) {

      updateData.totalQuestions =
        Number(
          updateData.totalQuestions
        );

    }

    // ========================================================
    // DATE
    // ========================================================

    if (
      updateData.testDate !==
      undefined
    ) {

      updateData.testDate =
        String(
          updateData.testDate
        ).trim();

    }

    // ========================================================
    // TIME
    // ========================================================

    if (
      updateData.testTime !==
      undefined
    ) {

      updateData.testTime =
        String(
          updateData.testTime
        ).trim();

    }

    // ========================================================
    // PUBLISHED
    // ========================================================

    if (
      updateData.isPublished !==
      undefined
    ) {

      updateData.isPublished =
        parseBoolean(
          updateData.isPublished,
          true
        );

    }

    // ========================================================
    // IMAGE
    // ========================================================

    if (
      req.files &&
      req.files.image
    ) {

      const imageFile =
        req.files.image as UploadedFile;

      const upload =
        await cloudinary.uploader.upload(
          imageFile.tempFilePath,
          {
            folder:
              "question_images",
          }
        );

      updateData.imageUrl =
        upload.secure_url;

    }

    // ========================================================
    // UPDATE
    // ========================================================

    const question =
      await QuestionBank.findByIdAndUpdate(

        req.params.id,

        updateData,

        {
          new: true,
          runValidators: true,
        }

      );

    if (!question) {

      res.status(404).json({

        success: false,

        message:
          "Question not found",

      });

      return;

    }

    // ========================================================
    // RESPONSE
    // ========================================================

    res.json({

      success: true,

      message:
        "Question updated successfully",

      question,

    });

  } catch (error: any) {

    console.log(
      "UPDATE QUESTION ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to update question",

    });

  }

};

// ============================================================
// 5. DELETE SINGLE QUESTION
// ============================================================

export const deleteQuestion = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    const deleted =
      await QuestionBank.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      res.status(404).json({

        success: false,

        message:
          "Question not found",

      });

      return;

    }

    res.json({

      success: true,

      message:
        "Question deleted successfully",

    });

  } catch (error: any) {

    console.log(
      "DELETE QUESTION ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to delete question",

    });

  }

};

// ============================================================
// 6. DELETE ALL QUESTIONS
// ============================================================

export const deleteAllQuestions = async (
  req: any,
  res: Response
): Promise<void> => {

  try {

    await QuestionBank.deleteMany({});

    res.json({

      success: true,

      message:
        "All questions deleted successfully",

    });

  } catch (error: any) {

    console.log(
      "DELETE ALL QUESTIONS ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to delete questions",

    });

  }

};

// ============================================================
// 7. GENERATE QUESTIONS FROM PDF
// ============================================================
//
// FLOW:
//
// PDF
//  ↓
// pdf-parse
//  ↓
// Regex Parser
//  ↓
// Validation
//  ↓
// Cloudinary PDF
//  ↓
// MongoDB
//
// NO GROQ AI
//
// ============================================================

export const generateQuestionsFromPDF = async (
  req: any,
  res: Response
): Promise<void> => {

  let parser:
    PDFParse | null = null;

  try {

    const head =
      req.head;

    // ========================================================
    // CHECK PDF
    // ========================================================

    if (
      !req.files ||
      !req.files.pdf
    ) {

      res.status(400).json({

        success: false,

        message:
          "PDF file required",

      });

      return;

    }

    const pdfFile =
      req.files.pdf as UploadedFile;

    console.log(
      "=========================================="
    );

    console.log(
      "📄 PDF UPLOAD STARTED"
    );

    console.log(
      "FILE:",
      pdfFile.name
    );

    console.log(
      "SIZE:",
      pdfFile.size
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // READ PDF
    // ========================================================

    const pdfBuffer =
      fs.readFileSync(
        pdfFile.tempFilePath
      );

    console.log(
      "📄 PDF BUFFER:",
      pdfBuffer.length
    );

    parser =
      new PDFParse({
        data: pdfBuffer,
      });

    const pdfData =
      await parser.getText();

    const extractedText =
      pdfData.text || "";

    console.log(
      "📄 EXTRACTED TEXT LENGTH:",
      extractedText.length
    );

    // ========================================================
    // EMPTY PDF
    // ========================================================

    if (
      !extractedText ||
      extractedText.trim().length === 0
    ) {

      res.status(400).json({

        success: false,

        message:
          "PDF text not found. This PDF may be scanned/image based. A text-based PDF is required.",

      });

      return;

    }

    // ========================================================
    // REGEX PARSER
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "📝 PDF REGEX PARSER STARTED"
    );

    console.log(
      "=========================================="
    );

    const parsedQuestions =
      parseQuestions(
        extractedText
      );

    console.log(
      "📝 PARSED QUESTIONS:",
      parsedQuestions.length
    );

    // ========================================================
    // NO QUESTIONS
    // ========================================================

    if (
      parsedQuestions.length === 0
    ) {

      res.status(400).json({

        success: false,

        message:
          "No questions detected in PDF. Please check the PDF question and option format.",

        extractedTextLength:
          extractedText.length,

      });

      return;

    }

    // ========================================================
    // FINAL QUESTIONS
    // DIRECT REGEX PARSER
    // ========================================================

    const finalQuestions =
      parsedQuestions;

    console.log(
      "=========================================="
    );

    console.log(
      "📝 FINAL PARSED QUESTIONS:",
      finalQuestions.length
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // METADATA
    // ========================================================

    const testCategory =
      normalizeTestCategory(
        req.body.testCategory
      );

    const examType =
      normalizeExamType(
        req.body.examType
      );

    const academicYear =
      normalizeAcademicYear(
        req.body.academicYear
      );

    const subject =
      String(
        req.body.subject ||
        "General"
      ).trim();

    const chapter =
      String(
        req.body.chapter ||
        ""
      ).trim();

    const testTitle =
      String(
        req.body.testTitle ||
        "Untitled Test"
      ).trim();

    // ========================================================
    // TEST ID
    // ========================================================

    const testId =
      String(
        req.body.testId ||
        `${examType}-${academicYear}-${testCategory}-${Date.now()}`
      ).trim();

    // ========================================================
    // TOTAL QUESTIONS
    // ========================================================

    let totalQuestions =
      Number(
        req.body.totalQuestions
      );

    if (
      !totalQuestions ||
      totalQuestions < 1
    ) {

      totalQuestions =
        finalQuestions.length;

    }

    // ========================================================
    // DATE / TIME
    // ========================================================

    const testDate =
      String(
        req.body.testDate ||
        ""
      ).trim();

    const testTime =
      String(
        req.body.testTime ||
        ""
      ).trim();

    // ========================================================
    // PDF ID
    // ========================================================

    const pdfId =
      `${testId}-${Date.now()}`;

    // ========================================================
    // CLOUDINARY PDF
    // ========================================================

    let pdfUrl = "";

    try {

      console.log(
        "☁️ UPLOADING PDF TO CLOUDINARY..."
      );

      const upload =
        await cloudinary.uploader.upload(

          pdfFile.tempFilePath,

          {

            resource_type:
              "raw",

            folder:
              "question_pdfs",

          }

        );

      pdfUrl =
        upload.secure_url;

      console.log(
        "☁️ PDF UPLOADED:"
      );

      console.log(
        pdfUrl
      );

    } catch (error) {

      console.log(
        "PDF CLOUDINARY ERROR:",
        error
      );

    }

    // ========================================================
    // PUBLISHED STATUS
    // ========================================================

    const isPublished =
      parseBoolean(
        req.body.isPublished,
        true
      );

    // ========================================================
    // PREPARE QUESTIONS
    // ========================================================

    const questionsToSave =
      finalQuestions.map(
        (
          q: any,
          index: number
        ) => {

          const options =
            Array.isArray(
              q.options
            )
              ? q.options
                  .map(
                    (option: any) =>
                      String(
                        option || ""
                      ).trim()
                  )
                  .filter(
                    (option: string) =>
                      option.length > 0
                  )
                  .slice(0, 4)
              : [];

          return {

            questionNumber:
              Number(
                q.questionNumber
              ) || index + 1,

            question:
              String(
                q.question ||
                ""
              ).trim(),

            options,

            correctAnswer:
              String(
                q.correctAnswer ||
                ""
              ).trim(),

            ansNumber:
              String(
                q.ansNumber ||
                ""
              ).trim(),

            questionType:
              q.questionType ||
              "MCQ",

            // ==================================================
            // SUBJECT
            // ==================================================

            subject,

            chapter,

            // ==================================================
            // TEST
            // ==================================================

            testCategory,

            examType,

            academicYear,

            testTitle,

            testId,

            totalQuestions,

            testDate,

            testTime,

            // ==================================================
            // OWNER
            // ==================================================

            teacherId:
              head?.headId ||
              head?._id ||
              "HEAD",

            // ==================================================
            // PDF
            // ==================================================

            pdfId,

            pdfSourceUrl:
              pdfUrl,

            // ==================================================
            // STATUS
            // ==================================================

            status:
              "pending",

            isAnswerCompleted:
              Boolean(
                q.correctAnswer ||
                q.ansNumber
              ),

            examTags: [],

            isPublished,

            imageUrl:
              q.imageUrl ||
              "",

          };

        }
      );

    // ========================================================
    // VALIDATE QUESTIONS
    // ========================================================

    const invalidQuestions =
      questionsToSave.filter(
        (q: any) => {

          return (

            !q.question ||

            !Array.isArray(
              q.options
            ) ||

            q.options.length !== 4

          );

        }
      );

    // ========================================================
    // VALID QUESTIONS
    // ========================================================

    const validQuestions =
      questionsToSave.filter(
        (q: any) => {

          return (

            q.question &&

            Array.isArray(
              q.options
            ) &&

            q.options.length === 4

          );

        }
      );

    console.log(
      "=========================================="
    );

    console.log(
      "📝 PARSER QUESTIONS:",
      finalQuestions.length
    );

    console.log(
      "✅ VALID QUESTIONS:",
      validQuestions.length
    );

    console.log(
      "⚠️ INVALID QUESTIONS:",
      invalidQuestions.length
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // NO VALID QUESTIONS
    // ========================================================

    if (
      validQuestions.length === 0
    ) {

      res.status(400).json({

        success: false,

        message:
          "PDF parser found questions, but no valid MCQ questions with exactly 4 options were found.",

        parsedQuestions:
          parsedQuestions.length,

        invalidQuestions:
          invalidQuestions.length,

      });

      return;

    }

    // ========================================================
    // SAVE TO DATABASE
    // ========================================================

    console.log(
      "💾 SAVING QUESTIONS TO MONGODB..."
    );

    const savedQuestions =
      await QuestionBank.insertMany(

        validQuestions,

        {
          ordered: false,
        }

      );

    console.log(
      "✅ QUESTIONS SAVED:",
      savedQuestions.length
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({

      success: true,

      message:
        "PDF parsed and questions saved successfully",

      parsedQuestions:
        parsedQuestions.length,

      validQuestions:
        validQuestions.length,

      invalidQuestions:
        invalidQuestions.length,

      totalQuestions:
        savedQuestions.length,

      testCategory,

      examType,

      academicYear,

      subject,

      chapter,

      testTitle,

      testId,

      totalQuestionsForTest:
        totalQuestions,

      testDate,

      testTime,

      pdfId,

      pdfSourceUrl:
        pdfUrl,

      questions:
        savedQuestions,

    });

  } catch (error: any) {

    console.error(
      "=========================================="
    );

    console.error(
      "❌ PDF PARSE ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "=========================================="
    );

    res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Failed to parse PDF",

    });

  } finally {

    // ========================================================
    // DESTROY PDF PARSER
    // ========================================================

    if (
      parser
    ) {

      try {

        await parser.destroy();

      } catch (error) {

        console.log(
          "PDF PARSER DESTROY ERROR:",
          error
        );

      }

    }

    // ========================================================
    // REMOVE TEMP PDF
    // ========================================================

    try {

      const pdfFile =
        req.files?.pdf as UploadedFile;

      if (
        pdfFile?.tempFilePath &&
        fs.existsSync(
          pdfFile.tempFilePath
        )
      ) {

        fs.unlinkSync(
          pdfFile.tempFilePath
        );

        console.log(
          "🗑️ TEMP PDF DELETED"
        );

      }

    } catch (error) {

      console.log(
        "TEMP PDF DELETE ERROR:",
        error
      );

    }

  }

};