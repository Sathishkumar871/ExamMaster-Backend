import { Request, Response } from "express";

import Question from "../models/questionModel";
import Result from "../models/resultModel";

import { parseQuestions } from "../services/pdfQuestionParser";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import axios from "axios";

import { v2 as cloudinary } from "cloudinary";

// ============================================================
// HELPERS
// ============================================================

const removeTempFile = (filePath?: string) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("TEMP FILE DELETE ERROR:", error);
  }
};

// ============================================================
// DOWNLOAD PDF
// ============================================================

const downloadPdfFromUrl = async (
  pdfUrl: string
): Promise<Buffer> => {
  const response = await axios.get(pdfUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: 100 * 1024 * 1024,
  });

  return Buffer.from(response.data);
};

// ============================================================
// BOOLEAN HELPER
// ============================================================

const toBoolean = (
  value: any,
  defaultValue = false
): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
};

// ============================================================
// ARRAY HELPER
// ============================================================

const normalizeArray = (
  value: any
): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

// ============================================================
// QUESTION TYPE HELPER
// ============================================================
const normalizeQuestionType = (
  value: any,
  imageUrl?: string,
  tableRows?: any[]
): "MCQ" | "TABLE" | "DIAGRAM" => {
  const type = String(value || "")
    .trim()
    .toUpperCase();

  // TABLE
  if (
    type === "TABLE" ||
    type === "MATCH_TABLE" ||
    type === "MATCH THE FOLLOWING"
  ) {
    return "TABLE";
  }

  // DIAGRAM
  if (
    type === "DIAGRAM" ||
    type === "IMAGE"
  ) {
    return "DIAGRAM";
  }

  // Auto detect TABLE
  if (
    Array.isArray(tableRows) &&
    tableRows.length > 0
  ) {
    return "TABLE";
  }

  // Auto detect DIAGRAM
  if (
    imageUrl &&
    String(imageUrl).trim()
  ) {
    return "DIAGRAM";
  }

  return "MCQ";
};
// ============================================================
// 1. GET ALL QUESTIONS
// ============================================================

export const getAllQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const questions = await Question.find({})
      .sort({
        globalQuestionNumber: 1,
        questionNumber: 1,
      })
      .lean();

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error(
      "GET ALL QUESTIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch questions",
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
    })
      .sort({
        globalQuestionNumber: 1,
        questionNumber: 1,
      })
      .lean();

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error(
      "GET PUBLISHED QUESTIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch published questions",
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
      testId,
    } = req.query;

    const targetClass =
      className || academicYear;

    const query: any = {
      isPublished: true,
    };

    // --------------------------------------------------------
    // SUBJECT
    // --------------------------------------------------------

    if (
      subject &&
      subject !== "All"
    ) {
      query.subject = subject;
    }

    // --------------------------------------------------------
    // TEST CATEGORY
    // --------------------------------------------------------

    if (
      testCategory &&
      testCategory !== "All"
    ) {
      query.testCategory = testCategory;
    }

    // --------------------------------------------------------
    // CLASS
    // --------------------------------------------------------

    if (
      targetClass &&
      targetClass !== "All"
    ) {
      query.className = targetClass;
    }

    // --------------------------------------------------------
    // EXAM TYPE
    // --------------------------------------------------------

    if (
      examType &&
      examType !== "All"
    ) {
      query.examType = examType;
    }

    // --------------------------------------------------------
    // TEST ID
    // --------------------------------------------------------

    if (
      testId &&
      testId !== "All"
    ) {
      query.testId = testId;
    }

    const questions = await Question.find(query)
      .sort({
        globalQuestionNumber: 1,
        questionNumber: 1,
      })
      .lean();

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error(
      "GET STUDENT QUESTIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch student questions",
    });
  }
};

// ============================================================
// 4. CREATE QUESTION MANUALLY
// + IMAGE / DIAGRAM
// + TABLE
// ============================================================

export const createQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bodyData: any = {
      ...req.body,
    };

    // ========================================================
    // CLASS NAME
    // ========================================================

    if (
      bodyData.academicYear &&
      !bodyData.className
    ) {
      bodyData.className =
        bodyData.academicYear;
    }

    delete bodyData.academicYear;

    // ========================================================
    // IMAGE URL
    // ========================================================

    let imageUrl =
      bodyData.imageUrl ||
      bodyData.questionImage ||
      "";

    // ========================================================
    // IMAGE UPLOAD
    // ========================================================

    if (req.file) {
      console.log(
        "=========================================="
      );

      console.log(
        "QUESTION IMAGE UPLOAD STARTED"
      );

      console.log(
        "FILE:",
        req.file.originalname
      );

      console.log(
        "=========================================="
      );

      try {
        const cloudinaryResponse =
          await cloudinary.uploader.upload(
            req.file.path,
            {
              folder:
                "exammaster/question_images",

              resource_type: "image",

              use_filename: true,

              unique_filename: true,

              overwrite: false,
            }
          );

        imageUrl =
          cloudinaryResponse.secure_url;

        removeTempFile(
          req.file.path
        );
      } catch (uploadError: any) {
        console.error(
          "QUESTION IMAGE CLOUDINARY ERROR:",
          uploadError
        );

        removeTempFile(
          req.file.path
        );

        res.status(500).json({
          success: false,
          message:
            uploadError.message ||
            "Failed to upload question image",
        });

        return;
      }
    }

    // ========================================================
    // OPTIONS
    // ========================================================

    bodyData.options = normalizeArray(
      bodyData.options
    );

    // ========================================================
    // TABLE HEADERS
    // ========================================================

   // ========================================================
// TABLE HEADERS
// ========================================================

if (bodyData.tableHeaders !== undefined) {
  bodyData.tableHeaders = normalizeArray(
    bodyData.tableHeaders
  ).map((header) => String(header ?? "").trim());
} else {
  bodyData.tableHeaders = [];
}

// ========================================================
// TABLE ROWS
// ========================================================

if (bodyData.tableRows !== undefined) {
  bodyData.tableRows = normalizeArray(
    bodyData.tableRows
  ).map((row) => {
    if (Array.isArray(row)) {
      return row.map((cell) =>
        String(cell ?? "").trim()
      );
    }

    // If a row comes as JSON string
    if (typeof row === "string") {
      try {
        const parsed = JSON.parse(row);

        if (Array.isArray(parsed)) {
          return parsed.map((cell) =>
            String(cell ?? "").trim()
          );
        }
      } catch {
        // ignore and keep as single-cell row
      }

      return [row.trim()];
    }

    return [];
  });
} else {
  bodyData.tableRows = [];
}
    // ========================================================
    // QUESTION TYPE
    // ========================================================

    bodyData.questionType =
      normalizeQuestionType(
        bodyData.questionType,
        imageUrl,
        bodyData.tableRows
      );

    // ========================================================
    // IMAGE COMPATIBILITY
    // ========================================================

    bodyData.imageUrl = imageUrl;

    bodyData.questionImage =
      imageUrl;

    // ========================================================
    // DEFAULT VALUES
    // ========================================================

    bodyData.isPublished =
      toBoolean(
        req.body.isPublished,
        false
      );

    bodyData.status =
      req.body.status ||
      "pending";

    bodyData.sourceType =
      req.body.sourceType ||
      "manual";

    bodyData.aiGenerated =
      toBoolean(
        req.body.aiGenerated,
        false
      );

    bodyData.aiVerified =
      toBoolean(
        req.body.aiVerified,
        false
      );

    bodyData.aiStatus =
      req.body.aiStatus ||
      "not_checked";

    bodyData.pdfId =
      req.body.pdfId ||
      "manual";

    bodyData.pdfSourceUrl =
      req.body.pdfSourceUrl ||
      "";

    // ========================================================
    // TEST ID
    // ========================================================

    bodyData.testId =
      req.body.testId ||
      `MANUAL-${Date.now()}`;

    // ========================================================
    // TOTAL QUESTIONS
    // ========================================================

    bodyData.totalQuestions =
      Number(
        req.body.totalQuestions || 0
      );

    // ========================================================
    // MARKS
    // ========================================================

    bodyData.marksPerQuestion =
      Number(
        req.body.marksPerQuestion || 4
      );

    bodyData.negativeMarks =
      Number(
        req.body.negativeMarks || 1
      );

    // ========================================================
    // ANSWER STATUS
    // ========================================================

    bodyData.isAnswerCompleted =
      Boolean(
        bodyData.correctAnswer &&
        String(
          bodyData.correctAnswer
        ).trim()
      );

    // ========================================================
    // CREATE
    // ========================================================

    const newQuestion =
      new Question(bodyData);

    await newQuestion.save();

    console.log(
      "QUESTION SAVED:",
      newQuestion._id
    );

    console.log(
      "QUESTION TYPE:",
      newQuestion.questionType
    );

    console.log(
      "IMAGE URL:",
      newQuestion.imageUrl
    );

    console.log(
      "TABLE ROWS:",
      newQuestion.tableRows
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({
      success: true,

      message:
        "Question added successfully as Draft!",

      question:
        newQuestion,

      imageUrl:
        newQuestion.imageUrl || "",

      questionImage:
        newQuestion.imageUrl ||
        newQuestion.imageUrl ||
        "",

      questionType:
        newQuestion.questionType,

      tableHeaders:
        newQuestion.tableHeaders || [],

      tableRows:
        newQuestion.tableRows || [],
    });
  } catch (error: any) {
    console.error(
      "CREATE QUESTION ERROR:",
      error
    );

    removeTempFile(
      req.file?.path
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
// 5. UPDATE QUESTION
// + IMAGE
// + DIAGRAM
// + TABLE
// ============================================================

export const updateQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updateData: any = {
      ...req.body,
    };

    // ========================================================
    // CLASS NAME
    // ========================================================

    if (
      updateData.academicYear &&
      !updateData.className
    ) {
      updateData.className =
        updateData.academicYear;
    }

    delete updateData.academicYear;

    // ========================================================
    // OPTIONS
    // ========================================================

    if (
      updateData.options !== undefined
    ) {
      updateData.options =
        normalizeArray(
          updateData.options
        );
    }

    // ========================================================
    // TABLE HEADERS
    // ========================================================

    if (
      updateData.tableHeaders !==
      undefined
    ) {
      updateData.tableHeaders =
        normalizeArray(
          updateData.tableHeaders
        );
    }

    // ========================================================
    // TABLE ROWS
    // ========================================================

    if (
      updateData.tableRows !==
      undefined
    ) {
      updateData.tableRows =
        normalizeArray(
          updateData.tableRows
        );
    }

    // ========================================================
    // IMAGE
    // ========================================================

    let imageUrl =
      updateData.imageUrl ||
      updateData.questionImage ||
      "";

    // ========================================================
    // NEW IMAGE UPLOAD
    // ========================================================

    if (req.file) {
      console.log(
        "=========================================="
      );

      console.log(
        "QUESTION IMAGE UPDATE STARTED"
      );

      console.log(
        "FILE:",
        req.file.originalname
      );

      console.log(
        "=========================================="
      );

      try {
        const cloudinaryResponse =
          await cloudinary.uploader.upload(
            req.file.path,
            {
              folder:
                "exammaster/question_images",

              resource_type: "image",

              use_filename: true,

              unique_filename: true,

              overwrite: false,
            }
          );

        imageUrl =
          cloudinaryResponse.secure_url;

        removeTempFile(
          req.file.path
        );
      } catch (uploadError: any) {
        console.error(
          "QUESTION IMAGE UPDATE CLOUDINARY ERROR:",
          uploadError
        );

        removeTempFile(
          req.file.path
        );

        res.status(500).json({
          success: false,
          message:
            uploadError.message ||
            "Failed to upload question image",
        });

        return;
      }
    }

    // ========================================================
    // IMAGE COMPATIBILITY
    // ========================================================

    if (imageUrl) {
      updateData.imageUrl =
        imageUrl;

      updateData.questionImage =
        imageUrl;
    }

    // ========================================================
    // QUESTION TYPE
    // ========================================================

    if (
      updateData.questionType ||
      updateData.tableRows ||
      imageUrl
    ) {
      updateData.questionType =
        normalizeQuestionType(
          updateData.questionType,
          imageUrl,
          updateData.tableRows
        );
    }

    // ========================================================
    // BOOLEAN VALUES
    // ========================================================

    if (
      updateData.isPublished !==
      undefined
    ) {
      updateData.isPublished =
        toBoolean(
          updateData.isPublished
        );
    }

    if (
      updateData.aiGenerated !==
      undefined
    ) {
      updateData.aiGenerated =
        toBoolean(
          updateData.aiGenerated
        );
    }

    if (
      updateData.aiVerified !==
      undefined
    ) {
      updateData.aiVerified =
        toBoolean(
          updateData.aiVerified
        );
    }

    // ========================================================
    // ANSWER COMPLETED
    // ========================================================

    if (
      updateData.correctAnswer !==
      undefined
    ) {
      updateData.isAnswerCompleted =
        Boolean(
          String(
            updateData.correctAnswer
          ).trim()
        );
    }

    // ========================================================
    // UPDATE
    // ========================================================

    const updatedQuestion =
      await Question.findByIdAndUpdate(
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
        message:
          "Question not found",
      });

      return;
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(200).json({
      success: true,

      message:
        "Question updated successfully!",

      question:
        updatedQuestion,

      imageUrl:
        updatedQuestion.imageUrl ||
        "",

      questionImage:
        updatedQuestion.imageUrl ||
        updatedQuestion.imageUrl ||
        "",

      questionType:
        updatedQuestion.questionType ||
        "MCQ",

      tableHeaders:
        updatedQuestion.tableHeaders ||
        [],

      tableRows:
        updatedQuestion.tableRows ||
        [],
    });
  } catch (error: any) {
    console.error(
      "UPDATE QUESTION ERROR:",
      error
    );

    removeTempFile(
      req.file?.path
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
// 6. DELETE QUESTION BY ID
// ============================================================

export const deleteQuestionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deletedQuestion =
      await Question.findByIdAndDelete(
        req.params.id
      );

    if (!deletedQuestion) {
      res.status(404).json({
        success: false,
        message:
          "Question not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Question deleted successfully!",
    });
  } catch (error: any) {
    console.error(
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
// 7. PDF UPLOAD + PARSE + SAVE
// ============================================================

export const parseAndSavePdfQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const file = req.file;

    try {
      // ======================================================
      // VALIDATE
      // ======================================================

      if (!file) {
        res.status(400).json({
          success: false,
          message:
            "Please upload a PDF file!",
        });

        return;
      }

      console.log(
        "=========================================="
      );

      console.log(
        "PDF UPLOAD STARTED"
      );

      console.log(
        "Original File:",
        file.originalname
      );

      console.log(
        "=========================================="
      );

      // ======================================================
      // UPLOAD PDF
      // ======================================================

      const cloudinaryResponse =
        await cloudinary.uploader.upload(
          file.path,
          {
            resource_type: "raw",

            folder:
              "exammaster/pdf_question_banks",

            use_filename: true,

            unique_filename: true,

            overwrite: false,
          }
        );

      const pdfSourceUrl =
        cloudinaryResponse.secure_url;

      // ======================================================
      // REMOVE TEMP
      // ======================================================

      removeTempFile(
        file.path
      );

      // ======================================================
      // DOWNLOAD PDF
      // ======================================================

      const cloudinaryPdfBuffer =
        await downloadPdfFromUrl(
          pdfSourceUrl
        );

      // ======================================================
      // PARSE PDF
      // ======================================================

     const parser = new PDFParse({
    data: cloudinaryPdfBuffer,
       });

   const pdfData = await parser.getText();

   const rawText = pdfData.text || "";

    console.log(
    "PDF TEXT LENGTH:",
    rawText.length
    );

    await parser.destroy();

      // ======================================================
      // EMPTY PDF
      // ======================================================

      if (!rawText.trim()) {
        res.status(400).json({
          success: false,
          message:
            "PDF contains no readable text.",
          pdfSourceUrl,
        });

        return;
      }

      // ======================================================
      // PARSE QUESTIONS
      // ======================================================

      const parsedQuestions =
        parseQuestions(
          rawText
        );

      if (
        !parsedQuestions ||
        parsedQuestions.length === 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Could not extract any valid MCQ questions from the PDF.",
          pdfSourceUrl,
        });

        return;
      }

      // ======================================================
      // TEST INFORMATION
      // ======================================================

      const examType =
        req.body.examType ||
        "JEE";

      const testCategory =
        req.body.testCategory ||
        "mock";

      const className =
        req.body.className ||
        req.body.academicYear ||
        "1st PUC";

      const testTitle =
        req.body.testTitle ||
        file.originalname.replace(
          /\.pdf$/i,
          ""
        );

      const teacherId =
        req.body.teacherId ||
        "HEAD";

      const testId =
        req.body.testId ||
        `PDF-${Date.now()}`;

      const pdfId =
        `PDF-${Date.now()}-${Math.floor(
          Math.random() * 100000
        )}`;

      // ======================================================
      // EXAM SETTINGS
      // ======================================================

      const marksPerQuestion =
        Number(
          req.body.marksPerQuestion ||
            4
        );

      const negativeMarks =
        Number(
          req.body.negativeMarks ||
            1
        );

      const durationMinutes =
        Number(
          req.body.durationMinutes ||
            180
        );

      // ======================================================
      // EXAM TAGS
      // ======================================================

      const examTags =
        normalizeArray(
          req.body.examTags
        );

      // ======================================================
      // CREATE DOCUMENTS
      // ======================================================

      const questionsToInsert =
        parsedQuestions.map(
          (
            q: any,
            index: number
          ) => {
            const tableHeaders =
              normalizeArray(
                q.tableHeaders
              );

            const tableRows =
              normalizeArray(
                q.tableRows
              );

            const imageUrl =
              q.imageUrl ||
              q.questionImage ||
              "";

            const questionType =
              normalizeQuestionType(
                q.questionType,
                imageUrl,
                tableRows
              );

            return {
              // ------------------------------------------------
              // QUESTION
              // ------------------------------------------------

              questionNumber:
                q.questionNumber ||
                index + 1,

              subjectQuestionNumber:
                q.subjectQuestionNumber ||
                0,

              globalQuestionNumber:
                q.globalQuestionNumber ||
                index + 1,

              question:
                q.question || "",

              options:
                normalizeArray(
                  q.options
                ).slice(0, 4),

              correctAnswer:
                q.correctAnswer ||
                "",

              ansNumber:
                q.ansNumber ||
                "",

              questionType,

              // ------------------------------------------------
              // TABLE
              // ------------------------------------------------

              tableHeaders,

              tableRows,

              // ------------------------------------------------
              // IMAGE / DIAGRAM
              // ------------------------------------------------

              imageUrl,

              questionImage:
                imageUrl,

              // ------------------------------------------------
              // SUBJECT
              // ------------------------------------------------

              subject:
                q.subject ||
                "Physics",

              chapter:
                q.chapter ||
                "",

              subjectOrder:
                q.subjectOrder ||
                1,

              // ------------------------------------------------
              // EXAM
              // ------------------------------------------------

              testCategory,

              examType,

              className,

              testTitle,

              testId,

              totalQuestions:
                parsedQuestions.length,

              // ------------------------------------------------
              // MARKING
              // ------------------------------------------------

              marksPerQuestion,

              negativeMarks,

              // ------------------------------------------------
              // TIMING
              // ------------------------------------------------

              durationMinutes,

              testDate:
                req.body.testDate ||
                "",

              testTime:
                req.body.testTime ||
                "",

              // ------------------------------------------------
              // OWNER
              // ------------------------------------------------

              teacherId,

              // ------------------------------------------------
              // PDF
              // ------------------------------------------------

              pdfId,

              pdfSourceUrl,

              // ------------------------------------------------
              // STATUS
              // ------------------------------------------------

              status:
                "pending",

              isAnswerCompleted:
                Boolean(
                  q.correctAnswer
                ),

              isPublished:
                false,

              // ------------------------------------------------
              // TAGS
              // ------------------------------------------------

              examTags,

              targetExamLevel:
                req.body.targetExamLevel ||
                examType,

              // ------------------------------------------------
              // AI
              // ------------------------------------------------

              aiGenerated:
                q.aiGenerated ??
                false,

              aiVerified:
                q.aiVerified ??
                false,

              aiStatus:
                q.aiStatus ||
                "not_checked",

              aiIssues:
                q.aiIssues ||
                [],

              aiExplanation:
                q.aiExplanation ||
                "",

              // ------------------------------------------------
              // SOURCE
              // ------------------------------------------------

              sourceType:
                "pdf",
            };
          }
        );

      // ======================================================
      // SAVE
      // ======================================================

      const savedQuestions =
        await Question.insertMany(
          questionsToInsert,
          {
            ordered: true,
          }
        );

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(201).json({
        success: true,

        message:
          `Successfully parsed ${savedQuestions.length} questions and saved them as Draft!`,

        count:
          savedQuestions.length,

        pdfId,

        pdfSourceUrl,

        testId,

        testTitle,

        examType,

        testCategory,

        className,

        questions:
          savedQuestions,
      });
    } catch (error: any) {
      console.error(
        "=========================================="
      );

      console.error(
        "PDF PARSE & SAVE ERROR:",
        error
      );

      console.error(
        "=========================================="
      );

      if (file) {
        removeTempFile(
          file.path
        );
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to process PDF",
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
    // ========================================================
    // SAFE BODY
    // ========================================================

    const body = req.body || {};

    const filter: any = {};

    // ========================================================
    // OPTIONAL TEST ID FILTER
    // ========================================================

    if (
      body.testId &&
      String(body.testId).trim()
    ) {
      filter.testId =
        String(body.testId).trim();
    }

    // ========================================================
    // OPTIONAL PDF ID FILTER
    // ========================================================

    if (
      body.pdfId &&
      String(body.pdfId).trim()
    ) {
      filter.pdfId =
        String(body.pdfId).trim();
    }

    // ========================================================
    // LOG
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "PUBLISH ALL QUESTIONS"
    );

    console.log(
      "FILTER:",
      filter
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // PUBLISH
    // ========================================================

    const result =
      await Question.updateMany(
        filter,
        {
          $set: {
            isPublished: true,
            status: "published",
          },
        }
      );

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(200).json({
      success: true,

      message:
        "Successfully published questions!",

      modifiedCount:
        result.modifiedCount || 0,

      matchedCount:
        result.matchedCount || 0,
    });

  } catch (error: any) {
    // ========================================================
    // ERROR
    // ========================================================

    console.error(
      "=========================================="
    );

    console.error(
      "PUBLISH ALL ERROR:",
      error
    );

    console.error(
      "=========================================="
    );

    res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to publish questions",
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

    console.log(
      "ALL QUESTIONS DELETED:",
      result.deletedCount
    );

    res.status(200).json({
      success: true,
      message:
        "All questions deleted successfully from Question Bank!",
      deletedCount:
        result.deletedCount || 0,
    });
  } catch (error: any) {
    console.error(
      "DELETE ALL ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete all questions",
    });
  }
};
// ============================================================
// 10. GET QUESTIONS BY CATEGORY
// ============================================================

export const getQuestionsByCategory =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        category,
      } = req.params;

      const {
        subject,
        className,
        academicYear,
        examType,
        testId,
      } = req.query;

      const targetClass =
        className ||
        academicYear;

      const query: any = {
        testCategory:
          category,

        isPublished:
          true,
      };

      // ------------------------------------------------------
      // SUBJECT
      // ------------------------------------------------------

      if (
        subject &&
        subject !== "All"
      ) {
        query.subject =
          subject;
      }

      // ------------------------------------------------------
      // CLASS
      // ------------------------------------------------------

      if (
        targetClass &&
        targetClass !== "All"
      ) {
        query.className =
          targetClass;
      }

      // ------------------------------------------------------
      // EXAM TYPE
      // ------------------------------------------------------

      if (
        examType &&
        examType !== "All"
      ) {
        query.examType =
          examType;
      }

      // ------------------------------------------------------
      // TEST ID
      // ------------------------------------------------------

      if (
        testId &&
        testId !== "All"
      ) {
        query.testId =
          testId;
      }

      const questions =
        await Question.find(
          query
        )
          .sort({
            globalQuestionNumber: 1,
            questionNumber: 1,
          })
          .lean();

      res.status(200).json({
        success: true,

        count:
          questions.length,

        questions,
      });
    } catch (error: any) {
      console.error(
        "GET CATEGORY QUESTIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch category questions",
      });
    }
  };

// ============================================================
// 11. SUBMIT TEST & CALCULATE RESULT
// ============================================================

export const submitTestResult = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      studentName,
      testId,
      answers,
      timeTaken,
      testCategory,
    } = req.body;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !studentId ||
      !testId ||
      !answers
    ) {
      res.status(400).json({
        success: false,
        message:
          "StudentId, testId, and answers are required",
      });

      return;
    }

    // ========================================================
    // GET QUESTIONS
    // ========================================================

    const questions =
      await Question.find({
        testId,
      })
        .sort({
          globalQuestionNumber: 1,
          questionNumber: 1,
        })
        .lean();

    if (
      !questions ||
      questions.length === 0
    ) {
      res.status(404).json({
        success: false,
        message:
          "Test questions not found for this testId",
      });

      return;
    }

    // ========================================================
    // COUNTERS
    // ========================================================

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let unansweredQuestions = 0;

    const review: any[] = [];

    // ========================================================
    // CHECK EACH QUESTION
    // ========================================================

    questions.forEach(
      (question: any) => {
        const questionId =
          String(
            question._id
          );

        const questionNumber =
          String(
            question.questionNumber
          );

        const selectedAnswer =
          answers[questionId] ??
          answers[questionNumber] ??
          "";

        const normalizedSelected =
          String(
            selectedAnswer
          ).trim();

        const normalizedCorrect =
          String(
            question.correctAnswer ||
              ""
          ).trim();

        const isAnswered =
          normalizedSelected !==
          "";

        const isCorrect =
          isAnswered &&
          normalizedSelected.toLowerCase() ===
            normalizedCorrect.toLowerCase();

        if (!isAnswered) {
          unansweredQuestions++;
        } else if (
          isCorrect
        ) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }

        // ======================================================
        // RESULT REVIEW
        // ======================================================

        review.push({
          questionId:
            question._id,

          question:
            question.question,

          questionType:
            question.questionType ||
            "MCQ",

          options:
            Array.isArray(
              question.options
            )
              ? question.options
              : [],

          // ----------------------------------------------------
          // DIAGRAM
          // ----------------------------------------------------

          imageUrl:
            question.imageUrl ||
            question.questionImage ||
            "",

          questionImage:
            question.questionImage ||
            question.imageUrl ||
            "",

          // ----------------------------------------------------
          // TABLE
          // ----------------------------------------------------

          tableHeaders:
            Array.isArray(
              question.tableHeaders
            )
              ? question.tableHeaders
              : [],

          tableRows:
            Array.isArray(
              question.tableRows
            )
              ? question.tableRows
              : [],

          // ----------------------------------------------------
          // ANSWERS
          // ----------------------------------------------------

          selectedAnswer:
            normalizedSelected ||
            "Not Attempted",

          correctAnswer:
            normalizedCorrect,

          isCorrect,

          // ----------------------------------------------------
          // EXPLANATION
          // ----------------------------------------------------

          explanation:
            question.aiExplanation ||
            question.explanation ||
            "",
        });
      }
    );

    // ========================================================
    // MARKS
    // ========================================================

    const totalQuestions =
      questions.length;

    const attemptedQuestions =
      correctAnswers +
      wrongAnswers;

    const marksPerQuestion =
      Number(
        questions[0]
          .marksPerQuestion ||
          4
      );

    const negativePerQuestion =
      Number(
        questions[0]
          .negativeMarks ||
          1
      );

    const marks =
      correctAnswers *
        marksPerQuestion -
      wrongAnswers *
        negativePerQuestion;

    const negativeMarks =
      wrongAnswers *
      negativePerQuestion;

    const maxMarks =
      totalQuestions *
      marksPerQuestion;

    // ========================================================
    // PERCENTAGE
    // ========================================================

    const percentage =
      maxMarks > 0
        ? Number(
            (
              (marks /
                maxMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    // ========================================================
    // GRADE
    // ========================================================

    let grade = "F";

    let status:
      | "PASS"
      | "FAIL" = "FAIL";

    if (
      percentage >= 90
    ) {
      grade = "A+";
      status = "PASS";
    } else if (
      percentage >= 75
    ) {
      grade = "A";
      status = "PASS";
    } else if (
      percentage >= 60
    ) {
      grade = "B";
      status = "PASS";
    } else if (
      percentage >= 40
    ) {
      grade = "C";
      status = "PASS";
    }

    // ========================================================
    // TEST INFO
    // ========================================================
const testTitle = 
  questions[0] 
    .testTitle || 
  "Exam Test"; 

const subject =
  questions[0]?.subject?.trim() || "Unknown";

const category = 
  testCategory || 
  questions[0] 
    .testCategory || 
  "daily";
    // ========================================================
    // SAVE RESULT
    // ========================================================
const savedResult =
  await Result.create({

    studentId,

    studentName:
      studentName || "Student",

    examId: null,

    examName:
      testTitle,

    testCategory:
      category,

    subject,

    totalQuestions,

    attemptedQuestions,

    unansweredQuestions,

    correctAnswers,

    wrongAnswers,

    marks,

    percentage,

    grade,

    status,

    timeTaken:
      timeTaken || 0,

    warnings: 0,

    rank: 0,

    resultAvailableAt:
      new Date(),

    isResultPublished:
      true,

    review,
  });
    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({
      success: true,

      message:
        "Test submitted successfully and saved to history!",

      result:
        savedResult,
    });
  } catch (error: any) {
    console.error(
      "SUBMIT TEST RESULT ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to submit test",
    });
  }
};

// ============================================================
// 12. UPLOAD QUESTION IMAGE
// ============================================================

export const uploadQuestionImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ========================================================
    // VALIDATE
    // ========================================================

    if (!req.file) {
      res.status(400).json({
        success: false,
        message:
          "Please upload a question image!",
      });

      return;
    }

    console.log(
      "=========================================="
    );

    console.log(
      "QUESTION IMAGE UPLOAD STARTED"
    );

    console.log(
      "FILE:",
      req.file.originalname
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // CLOUDINARY
    // ========================================================

    const cloudinaryResponse =
      await cloudinary.uploader.upload(
        req.file.path,
        {
          folder:
            "exammaster/question_images",

          resource_type: "image",

          use_filename: true,

          unique_filename: true,

          overwrite: false,
        }
      );

    const imageUrl =
      cloudinaryResponse.secure_url;

    // ========================================================
    // DELETE TEMP
    // ========================================================

    removeTempFile(
      req.file.path
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(200).json({
      success: true,

      message:
        "Question image uploaded successfully!",

      imageUrl,

      questionImage:
        imageUrl,

      publicId:
        cloudinaryResponse.public_id,

      resourceType:
        cloudinaryResponse.resource_type,
    });
  } catch (error: any) {
    console.error(
      "UPLOAD QUESTION IMAGE ERROR:",
      error
    );

    removeTempFile(
      req.file?.path
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to upload question image",
    });
  }
};