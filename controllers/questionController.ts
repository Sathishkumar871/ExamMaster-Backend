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
    console.error(
      "TEMP FILE DELETE ERROR:",
      error
    );
  }
};

// ============================================================
// DOWNLOAD PDF
// ============================================================

const downloadPdfFromUrl = async (
  pdfUrl: string
): Promise<Buffer> => {
  const response = await axios.get(
    pdfUrl,
    {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength:
        100 * 1024 * 1024,
    }
  );

  return Buffer.from(
    response.data
  );
};

// ============================================================
// BOOLEAN HELPER
// ============================================================

const toBoolean = (
  value: any,
  defaultValue = false
): boolean => {
  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return (
      value.toLowerCase() ===
      "true"
    );
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
      const parsed =
        JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(",")
        .map((item) =>
          item.trim()
        )
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
):
  | "MCQ"
  | "TABLE"
  | "DIAGRAM" => {
  const type = String(
    value || ""
  )
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
// MOCK PUBLISH DATE/TIME PARSER
// India timezone = +05:30
//
// Only used for Mock Test.
//
// Accepted:
// publishDate / publishTime
// OR
// testDate / testTime
// ============================================================
const buildMockPublishAt = (
  testCategory: string,
  body: any
): Date | null => {

  // Only Mock Test uses scheduled publishing
  if (testCategory !== "mock") {
    return null;
  }

  // ======================================================
  // FRONTEND DIRECT publishAt
  // ======================================================

  if (body?.publishAt) {
    const directPublishAt = new Date(
      body.publishAt
    );

    if (
      Number.isNaN(
        directPublishAt.getTime()
      )
    ) {
      throw new Error(
        "Invalid Mock Test publish date/time."
      );
    }

    return directPublishAt;
  }

  // ======================================================
  // FALLBACK: publishDate + publishTime
  // ======================================================

  const publishDate = String(
    body?.publishDate ||
      body?.testDate ||
      ""
  ).trim();

  const publishTime = String(
    body?.publishTime ||
      body?.testTime ||
      ""
  ).trim();

  // No schedule selected
  if (
    !publishDate &&
    !publishTime
  ) {
    return null;
  }

  // Both required
  if (
    !publishDate ||
    !publishTime
  ) {
    throw new Error(
      "For Mock Test, both Publish Date and Publish Time are required."
    );
  }

  // Validate date
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      publishDate
    )
  ) {
    throw new Error(
      "Invalid Publish Date. Expected YYYY-MM-DD."
    );
  }

  // Validate time
  if (
    !/^\d{2}:\d{2}$/.test(
      publishTime
    )
  ) {
    throw new Error(
      "Invalid Publish Time. Expected HH:mm."
    );
  }

  // India timezone
  const publishAt = new Date(
    `${publishDate}T${publishTime}:00+05:30`
  );

  if (
    Number.isNaN(
      publishAt.getTime()
    )
  ) {
    throw new Error(
      "Invalid Mock Test publish date/time."
    );
  }

  return publishAt;
};

// ============================================================
// 1. GET ALL QUESTIONS
// ============================================================

export const getAllQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const questions =
        await Question.find({})
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

export const getPublishedQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const now = new Date();

      const questions =
        await Question.find({
          isPublished: true,

          $or: [
            // Daily / Subject / old manual Mock
            {
              publishAt: null,
            },

            // Scheduled Mock already reached
            {
              publishAt: {
                $lte: now,
              },
            },
          ],
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

export const getStudentQuestions =
  async (
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
        className ||
        academicYear;

      const query: any = {
        isPublished: true,
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
      // TEST CATEGORY
      // ------------------------------------------------------

      if (
        testCategory &&
        testCategory !== "All"
      ) {
        query.testCategory =
          testCategory;
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
        query.testId = testId;
      }

      // ------------------------------------------------------
      // MOCK SCHEDULE SAFETY
      // ------------------------------------------------------

      if (
        testCategory &&
        String(testCategory)
          .toLowerCase() ===
          "mock"
      ) {
        query.$or = [
          {
            publishAt: null,
          },
          {
            publishAt: {
              $lte: new Date(),
            },
          },
        ];
      }

      // ------------------------------------------------------
      // GET
      // ------------------------------------------------------

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
// + IMAGE
// + TABLE
// ============================================================

export const createQuestion =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const bodyData: any = {
        ...req.body,
      };

      // ======================================================
      // CLASS NAME
      // ======================================================

      if (
        bodyData.academicYear &&
        !bodyData.className
      ) {
        bodyData.className =
          bodyData.academicYear;
      }

      delete bodyData.academicYear;

      // ======================================================
      // IMAGE
      // ======================================================

      let imageUrl =
        bodyData.imageUrl ||
        bodyData.questionImage ||
        "";

      // ======================================================
      // IMAGE UPLOAD
      // ======================================================

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

                resource_type:
                  "image",

                use_filename:
                  true,

                unique_filename:
                  true,

                overwrite:
                  false,
              }
            );

          imageUrl =
            cloudinaryResponse.secure_url;

          removeTempFile(
            req.file.path
          );
        } catch (
          uploadError: any
        ) {
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

      // ======================================================
      // OPTIONS
      // ======================================================

      bodyData.options =
        normalizeArray(
          bodyData.options
        );

      // ======================================================
      // TABLE HEADERS
      // ======================================================

      if (
        bodyData.tableHeaders !==
        undefined
      ) {
        bodyData.tableHeaders =
          normalizeArray(
            bodyData.tableHeaders
          ).map((header) =>
            String(
              header ?? ""
            ).trim()
          );
      } else {
        bodyData.tableHeaders =
          [];
      }

      // ======================================================
      // TABLE ROWS
      // ======================================================

      if (
        bodyData.tableRows !==
        undefined
      ) {
        bodyData.tableRows =
          normalizeArray(
            bodyData.tableRows
          ).map((row) => {
            if (
              Array.isArray(row)
            ) {
              return row.map(
                (cell) =>
                  String(
                    cell ?? ""
                  ).trim()
              );
            }

            if (
              typeof row ===
              "string"
            ) {
              try {
                const parsed =
                  JSON.parse(row);

                if (
                  Array.isArray(
                    parsed
                  )
                ) {
                  return parsed.map(
                    (cell) =>
                      String(
                        cell ?? ""
                      ).trim()
                  );
                }
              } catch {
                // ignore
              }

              return [
                row.trim(),
              ];
            }

            return [];
          });
      } else {
        bodyData.tableRows =
          [];
      }

      // ======================================================
      // QUESTION TYPE
      // ======================================================

      bodyData.questionType =
        normalizeQuestionType(
          bodyData.questionType,
          imageUrl,
          bodyData.tableRows
        );

      // ======================================================
      // IMAGE COMPATIBILITY
      // ======================================================

      bodyData.imageUrl =
        imageUrl;

      bodyData.questionImage =
        imageUrl;

      // ======================================================
      // DEFAULTS
      // ======================================================

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

      // ======================================================
      // TEST ID
      // ======================================================

      bodyData.testId =
        req.body.testId ||
        `MANUAL-${Date.now()}`;

      // ======================================================
      // TOTAL QUESTIONS
      // ======================================================

      bodyData.totalQuestions =
        Number(
          req.body.totalQuestions ||
          0
        );

      // ======================================================
      // MARKS
      // ======================================================

      bodyData.marksPerQuestion =
        Number(
          req.body
            .marksPerQuestion ||
          4
        );

      bodyData.negativeMarks =
        Number(
          req.body.negativeMarks ||
          1
        );

      // ======================================================
      // PUBLISH AT
      // Manual creation:
      // only mock uses publishAt
      // ======================================================

      if (
        String(
          bodyData.testCategory ||
            ""
        ).toLowerCase() ===
        "mock"
      ) {
        try {
          bodyData.publishAt =
            buildMockPublishAt(
              "mock",
              req.body
            );
        } catch (
          scheduleError: any
        ) {
          res.status(400).json({
            success: false,
            message:
              scheduleError.message,
          });

          return;
        }
      } else {
        bodyData.publishAt =
          null;
      }

      // ======================================================
      // ANSWER STATUS
      // ======================================================

      bodyData.isAnswerCompleted =
        Boolean(
          bodyData.correctAnswer &&
          String(
            bodyData.correctAnswer
          ).trim()
        );

      // ======================================================
      // CREATE
      // ======================================================

      const newQuestion =
        new Question(
          bodyData
        );

      await newQuestion.save();

      console.log(
        "QUESTION SAVED:",
        newQuestion._id
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      res.status(201).json({
        success: true,
        message:
          "Question added successfully as Draft!",
        question:
          newQuestion,
        imageUrl:
          newQuestion.imageUrl ||
          "",
        questionImage:
          newQuestion.imageUrl ||
          "",
        questionType:
          newQuestion.questionType,
        tableHeaders:
          newQuestion.tableHeaders ||
          [],
        tableRows:
          newQuestion.tableRows ||
          [],
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
// ============================================================

export const updateQuestion =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const updateData: any = {
        ...req.body,
      };

      // ======================================================
      // CLASS NAME
      // ======================================================

      if (
        updateData.academicYear &&
        !updateData.className
      ) {
        updateData.className =
          updateData.academicYear;
      }

      delete updateData.academicYear;

      // ======================================================
      // OPTIONS
      // ======================================================

      if (
        updateData.options !==
        undefined
      ) {
        updateData.options =
          normalizeArray(
            updateData.options
          );
      }

      // ======================================================
      // TABLE HEADERS
      // ======================================================

      if (
        updateData.tableHeaders !==
        undefined
      ) {
        updateData.tableHeaders =
          normalizeArray(
            updateData.tableHeaders
          );
      }

      // ======================================================
      // TABLE ROWS
      // ======================================================

      if (
        updateData.tableRows !==
        undefined
      ) {
        updateData.tableRows =
          normalizeArray(
            updateData.tableRows
          );
      }

      // ======================================================
      // IMAGE
      // ======================================================

      let imageUrl =
        updateData.imageUrl ||
        updateData.questionImage ||
        "";

      // ======================================================
      // NEW IMAGE
      // ======================================================

      if (req.file) {
        console.log(
          "QUESTION IMAGE UPDATE STARTED"
        );

        console.log(
          "FILE:",
          req.file.originalname
        );

        try {
          const cloudinaryResponse =
            await cloudinary.uploader.upload(
              req.file.path,
              {
                folder:
                  "exammaster/question_images",

                resource_type:
                  "image",

                use_filename:
                  true,

                unique_filename:
                  true,

                overwrite:
                  false,
              }
            );

          imageUrl =
            cloudinaryResponse.secure_url;

          removeTempFile(
            req.file.path
          );
        } catch (
          uploadError: any
        ) {
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

      // ======================================================
      // IMAGE COMPATIBILITY
      // ======================================================

      if (imageUrl) {
        updateData.imageUrl =
          imageUrl;

        updateData.questionImage =
          imageUrl;
      }

      // ======================================================
      // QUESTION TYPE
      // ======================================================

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

      // ======================================================
      // BOOLEAN
      // ======================================================

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

      // ======================================================
      // ANSWER COMPLETED
      // ======================================================

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

      // ======================================================
      // AI ISSUES
      // ======================================================

      if (
        "aiIssues" in
        updateData
      ) {
        delete updateData.aiIssues;
      }

      // ======================================================
      // PUBLISH AT
      // Only Mock
      // ======================================================

      if (
        updateData.testCategory !==
        undefined
      ) {
        const category =
          String(
            updateData.testCategory
          )
            .trim()
            .toLowerCase();

        if (
          category === "mock"
        ) {
          try {
            const publishAt =
              buildMockPublishAt(
                "mock",
                updateData
              );

            updateData.publishAt =
              publishAt;
          } catch (
            scheduleError: any
          ) {
            res.status(400).json({
              success: false,
              message:
                scheduleError.message,
            });

            return;
          }
        } else {
          updateData.publishAt =
            null;
        }
      }

      // ======================================================
      // UPDATE
      // ======================================================

      const updatedQuestion =
        await Question.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (
        !updatedQuestion
      ) {
        res.status(404).json({
          success: false,
          message:
            "Question not found",
        });

        return;
      }

      // ======================================================
      // RESPONSE
      // ======================================================

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

export const deleteQuestionById =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const deletedQuestion =
        await Question.findByIdAndDelete(
          req.params.id
        );

      if (
        !deletedQuestion
      ) {
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
      // VALIDATE FILE
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
      // CLOUDINARY PDF UPLOAD
      // ======================================================

      const cloudinaryResponse =
        await cloudinary.uploader.upload(
          file.path,
          {
            resource_type:
              "raw",

            folder:
              "exammaster/pdf_question_banks",

            use_filename:
              true,

            unique_filename:
              true,

            overwrite:
              false,
          }
        );

      const pdfSourceUrl =
        cloudinaryResponse.secure_url;

      // ======================================================
      // REMOVE TEMP FILE
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

      const parser =
        new PDFParse({
          data:
            cloudinaryPdfBuffer,
        });

      const pdfData =
        await parser.getText();

      const rawText =
        pdfData.text || "";

      console.log(
        "PDF TEXT LENGTH:",
        rawText.length
      );

      await parser.destroy();

      // ======================================================
      // EMPTY PDF
      // ======================================================

      if (
        !rawText.trim()
      ) {
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
        parsedQuestions.length ===
          0
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

      const testCategory =
        String(
          req.body.testCategory ||
            "mock"
        )
          .trim()
          .toLowerCase();

      const selectedSubject =
        String(
          req.body.subject ||
            ""
        ).trim();

      // ------------------------------------------------------
      // SUBJECT TEST
      // examType = ""
      //
      // MOCK / DAILY
      // examType = JEE / NEET
      // ------------------------------------------------------

      const examType =
        testCategory ===
        "subject"
          ? ""
          : String(
              req.body.examType ||
                "JEE"
            ).trim();

      const className =
        String(
          req.body.className ||
            req.body.academicYear ||
            "1st PUC"
        ).trim();

      const testTitle =
        String(
          req.body.testTitle ||
            file.originalname.replace(
              /\.pdf$/i,
              ""
            )
        ).trim();

      const teacherId =
        String(
          req.body.teacherId ||
            "HEAD"
        ).trim();

      // ------------------------------------------------------
      // TEST ID
      // One PDF/Test = one testId
      // ------------------------------------------------------

      const testId =
        String(
          req.body.testId ||
            `PDF-${Date.now()}`
        ).trim();

      // ------------------------------------------------------
      // PDF ID
      // ------------------------------------------------------

      const pdfId =
        `PDF-${Date.now()}-${Math.floor(
          Math.random() * 100000
        )}`;

      // ======================================================
      // SUBJECT VALIDATION
      // ======================================================

      if (!selectedSubject) {
        res.status(400).json({
          success: false,
          message:
            "Please select a subject before uploading the PDF.",
          pdfSourceUrl,
        });

        return;
      }

      // ======================================================
      // MOCK SCHEDULE
      // ONLY MOCK TEST
      // ======================================================

      let publishAt:
        | Date
        | null = null;

      try {
        publishAt =
          buildMockPublishAt(
            testCategory,
            req.body
          );
      } catch (
        scheduleError: any
      ) {
        res.status(400).json({
          success: false,
          message:
            scheduleError.message,
          pdfSourceUrl,
        });

        return;
      }

      console.log(
        "TEST CATEGORY:",
        testCategory
      );

      console.log(
        "EXAM TYPE:",
        examType
      );

      console.log(
        "CLASS:",
        className
      );

      console.log(
        "SUBJECT:",
        selectedSubject
      );

      console.log(
        "TEST ID:",
        testId
      );

      console.log(
        "PUBLISH AT:",
        publishAt
      );

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
      // CREATE QUESTIONS
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

            // ------------------------------------------------
            // SUBJECT
            // Always use selected frontend subject.
            // This prevents parser's random subject from
            // overriding Physics/Chemistry/etc.
            // ------------------------------------------------

            const subject =
              selectedSubject;

            return {
              // ----------------------------------------------
              // QUESTION
              // ----------------------------------------------

              questionNumber:
                q.questionNumber ||
                index + 1,

              subjectQuestionNumber:
                q.subjectQuestionNumber ||
                index + 1,

              globalQuestionNumber:
                q.globalQuestionNumber ||
                index + 1,

              question:
                q.question ||
                "",

              // ----------------------------------------------
              // OPTIONS
              // ----------------------------------------------

              options: (() => {
                const extractedOptions =
                  normalizeArray(
                    q.options
                  )
                    .map(
                      (option) =>
                        String(
                          option ?? ""
                        ).trim()
                    )
                    .filter(Boolean);

                return extractedOptions.length ===
                  4
                  ? extractedOptions.slice(
                      0,
                      4
                    )
                  : [];
              })(),

              // ----------------------------------------------
              // ANSWER
              // ----------------------------------------------

              correctAnswer:
                q.correctAnswer ||
                "",

              ansNumber:
                q.ansNumber ||
                "",

              questionType,

              // ----------------------------------------------
              // TABLE
              // ----------------------------------------------

              tableHeaders,

              tableRows,

              // ----------------------------------------------
              // IMAGE
              // ----------------------------------------------

              imageUrl,

              questionImage:
                imageUrl,

              // ----------------------------------------------
              // SUBJECT
              // ----------------------------------------------

              subject,

              chapter:
                q.chapter?.trim() ||
                "General Physics",

              subjectOrder:
                q.subjectOrder ||
                index + 1,

              // ----------------------------------------------
              // TEST
              // ----------------------------------------------

              testCategory,

              examType,

              className,

              testTitle,

              testId,

              totalQuestions:
                parsedQuestions.length,

              // ----------------------------------------------
              // MARKING
              // ----------------------------------------------

              marksPerQuestion,

              negativeMarks,

              // ----------------------------------------------
              // TIMING
              // ----------------------------------------------

              durationMinutes,

              testDate:
                req.body.testDate ||
                "",

              testTime:
                req.body.testTime ||
                "",

              // ----------------------------------------------
              // MOCK PUBLISH TIME
              // Daily/Subject = null
              // Mock = scheduled Date/null
              // ----------------------------------------------

              publishAt,

              // ----------------------------------------------
              // OWNER
              // ----------------------------------------------

              teacherId,

              // ----------------------------------------------
              // PDF
              // ----------------------------------------------

              pdfId,

              pdfSourceUrl,

              // ----------------------------------------------
              // STATUS
              // ----------------------------------------------

              status:
                "pending",

              isAnswerCompleted:
                Boolean(
                  q.correctAnswer &&
                  String(
                    q.correctAnswer
                  ).trim()
                ),

              // IMPORTANT:
              // Always false when uploaded.
              // Scheduler or manual publish will turn true.
              isPublished:
                false,

              // ----------------------------------------------
              // TAGS
              // ----------------------------------------------

              examTags,

              targetExamLevel:
                req.body
                  .targetExamLevel ||
                (examType ||
                  "board"),

              // ----------------------------------------------
              // AI
              // ----------------------------------------------

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

              // ----------------------------------------------
              // SOURCE
              // ----------------------------------------------

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

        publishAt,

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
// 8. PUBLISH QUESTIONS BY TEST ID
// ============================================================
//
// IMPORTANT:
// testId is REQUIRED.
//
// Global Publish All is NOT allowed.
//
// Example:
// MOCK-001 -> publish only MOCK-001
// MOCK-002 -> remains untouched
// ============================================================

export const publishAllQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const testId =
        String(
          req.body?.testId ||
            ""
        ).trim();

      // ------------------------------------------------------
      // REQUIRED
      // ------------------------------------------------------

      if (!testId) {
        res.status(400).json({
          success: false,
          message:
            "testId is required. Global publish is not allowed.",
        });

        return;
      }

      // ------------------------------------------------------
      // FIND TEST
      // ------------------------------------------------------

      const test =
        await Question.findOne({
          testId,
        }).lean();

      if (!test) {
        res.status(404).json({
          success: false,
          message:
            "No questions found for this testId.",
        });

        return;
      }

      // ------------------------------------------------------
      // MOCK SCHEDULE CHECK
      // ------------------------------------------------------

      if (
        test.testCategory ===
        "mock"
      ) {
        if (
          test.publishAt &&
          new Date(
            test.publishAt
          ).getTime() >
            Date.now()
        ) {
          res.status(400).json({
            success: false,
            message:
              "This Mock Test is scheduled for future publishing and cannot be published yet.",
            testId,
            publishAt:
              test.publishAt,
          });

          return;
        }
      }

      // ------------------------------------------------------
      // PUBLISH ONLY THIS TEST
      // ------------------------------------------------------

      const result =
        await Question.updateMany(
          {
            testId,
          },
          {
            $set: {
              isPublished:
                true,

              status:
                "published",
            },
          }
        );

      console.log(
        "=========================================="
      );

      console.log(
        "TEST PUBLISHED"
      );

      console.log(
        "TEST ID:",
        testId
      );

      console.log(
        "MODIFIED:",
        result.modifiedCount
      );

      console.log(
        "=========================================="
      );

      res.status(200).json({
        success: true,

        message:
          "Selected test published successfully.",

        testId,

        modifiedCount:
          result.modifiedCount ||
          0,

        matchedCount:
          result.matchedCount ||
          0,
      });
    } catch (error: any) {
      console.error(
        "PUBLISH TEST ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to publish test.",
      });
    }
  };

// ============================================================
// 9. DELETE QUESTIONS BY TEST ID
// ============================================================
//
// IMPORTANT:
// testId is REQUIRED.
//
// Global delete is NOT allowed.
// ============================================================

export const deleteAllQuestions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const testId =
        String(
          req.body?.testId ||
            ""
        ).trim();

      // ------------------------------------------------------
      // REQUIRED
      // ------------------------------------------------------

      if (!testId) {
        res.status(400).json({
          success: false,
          message:
            "testId is required. Global delete is not allowed.",
        });

        return;
      }

      // ------------------------------------------------------
      // DELETE ONLY THIS TEST
      // ------------------------------------------------------

      const result =
        await Question.deleteMany({
          testId,
        });

      console.log(
        "=========================================="
      );

      console.log(
        "TEST QUESTIONS DELETED"
      );

      console.log(
        "TEST ID:",
        testId
      );

      console.log(
        "DELETED:",
        result.deletedCount
      );

      console.log(
        "=========================================="
      );

      res.status(200).json({
        success: true,

        message:
          "Selected test questions deleted successfully.",

        testId,

        deletedCount:
          result.deletedCount ||
          0,
      });
    } catch (error: any) {
      console.error(
        "DELETE TEST ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to delete test questions.",
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

      // ------------------------------------------------------
      // MOCK SCHEDULE SAFETY
      // ------------------------------------------------------

      if (
        String(category)
          .toLowerCase() ===
        "mock"
      ) {
        query.$or = [
          {
            publishAt: null,
          },
          {
            publishAt: {
              $lte: new Date(),
            },
          },
        ];
      }

      // ------------------------------------------------------
      // GET
      // ------------------------------------------------------

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

export const submitTestResult =
  async (
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

      // ======================================================
      // VALIDATION
      // ======================================================

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

      // ======================================================
      // GET QUESTIONS
      // ======================================================

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

      // ======================================================
      // COUNTERS
      // ======================================================

      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unansweredQuestions = 0;

      const review: any[] = [];

      // ======================================================
      // CHECK QUESTIONS
      // ======================================================

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
            answers[
              questionId
            ] ??
            answers[
              questionNumber
            ] ??
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
            normalizedSelected
              .toLowerCase() ===
              normalizedCorrect
                .toLowerCase();

          if (!isAnswered) {
            unansweredQuestions++;
          } else if (
            isCorrect
          ) {
            correctAnswers++;
          } else {
            wrongAnswers++;
          }

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

            imageUrl:
              question.imageUrl ||
              question.questionImage ||
              "",

            questionImage:
              question.questionImage ||
              question.imageUrl ||
              "",

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

            selectedAnswer:
              normalizedSelected ||
              "Not Attempted",

            correctAnswer:
              normalizedCorrect,

            isCorrect,

            explanation:
              question.aiExplanation ||
              question.explanation ||
              "",
          });
        }
      );

      // ======================================================
      // MARKS
      // ======================================================

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

      const maxMarks =
        totalQuestions *
        marksPerQuestion;

      // ======================================================
      // PERCENTAGE
      // ======================================================

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

      // ======================================================
      // GRADE
      // ======================================================

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

      // ======================================================
      // TEST INFO
      // ======================================================

      const testTitle =
        questions[0]
          .testTitle ||
        "Exam Test";

      const subject =
        questions[0]?.subject?.trim() ||
        "Unknown";

      const category =
        testCategory ||
        questions[0]
          .testCategory ||
        "daily";

      // ======================================================
      // SAVE RESULT
      // ======================================================

      const savedResult =
        await Result.create({
          studentId,

          studentName:
            studentName ||
            "Student",

          examId:
            null,

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

      // ======================================================
      // RESPONSE
      // ======================================================

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

export const uploadQuestionImage =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // ======================================================
      // VALIDATE
      // ======================================================

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

      // ======================================================
      // CLOUDINARY
      // ======================================================

      const cloudinaryResponse =
        await cloudinary.uploader.upload(
          req.file.path,
          {
            folder:
              "exammaster/question_images",

            resource_type:
              "image",

            use_filename:
              true,

            unique_filename:
              true,

            overwrite:
              false,
          }
        );

      const imageUrl =
        cloudinaryResponse.secure_url;

      // ======================================================
      // DELETE TEMP
      // ======================================================

      removeTempFile(
        req.file.path
      );

      // ======================================================
      // RESPONSE
      // ======================================================

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