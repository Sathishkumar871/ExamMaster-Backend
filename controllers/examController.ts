import { Request, Response } from "express";

import Exam from "../models/examModel";
import QuestionBank from "../models/questionModel";
import ExamSession from "../models/ExamSession";
import Result from "../models/resultModel";


// ============================================================
// CREATE EXAM
// ============================================================

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
      teacherId,
      examType,
      testCategory,
      examName
    } = req.body;


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !title ||
      !subject ||
      !chapter ||
      !className ||
      !teacherId ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Title, Subject, Chapter, ClassName, TeacherId and Questions required"

      });

    }


    // ========================================================
    // NORMALIZE SUBJECT
    // ========================================================

    const normalizedSubject =
      String(subject).trim();


    const allowedSubjects = [
      "Physics",
      "Chemistry",
      "Biology",
      "Zoology"
    ];


    if (
      !allowedSubjects.includes(
        normalizedSubject
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid subject. Use Physics, Chemistry, Biology or Zoology."

      });

    }


    // ========================================================
    // TEST CATEGORY
    // ========================================================

    const normalizedCategory =
      testCategory === "daily"
        ? "daily"
        : testCategory === "subject"
        ? "subject"
        : "mock";


    // ========================================================
    // EXAM TYPE
    // ========================================================

    const normalizedExamType =
      examType === "JEE"
        ? "JEE"
        : "NEET";


    // ========================================================
    // CREATE EXAM
    // ========================================================

    const exam = await Exam.create({

      title,

      examName:
        examName ||
        title,

      subject:
        normalizedSubject,

      chapter,

      className,

      examType:
        normalizedCategory,

      testCategory:
        normalizedCategory,

      questions,

      totalQuestions:
        questions.length,

      duration:
        Number(duration) || 180,

      createdBy:
        teacherId,

      status:
        "draft",

      isPublished:
        false,

      targetExam:
        normalizedExamType

    });


    return res.status(201).json({

      success: true,

      message:
        `${normalizedSubject} exam created successfully`,

      exam

    });

  }

  catch (error: any) {

    console.log(
      "CREATE EXAM ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to create exam"

    });

  }

};


// ============================================================
// GET TEACHER EXAMS
// ============================================================

export const getTeacherExams = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {
      teacherId,
      subject,
      testCategory
    } = req.query;


    if (!teacherId) {

      return res.status(400).json({

        success: false,

        message:
          "TeacherId required"

      });

    }


    const filter: any = {

      createdBy:
        String(teacherId)

    };


    // ========================================================
    // SUBJECT FILTER
    // ========================================================

    if (subject) {

      filter.subject =
        String(subject);

    }


    // ========================================================
    // CATEGORY FILTER
    // ========================================================

    if (
      testCategory &&
      [
        "mock",
        "daily",
        "subject"
      ].includes(
        String(testCategory)
      )
    ) {

      filter.testCategory =
        String(testCategory);

    }


    const exams =
      await Exam.find(filter)
        .sort({
          createdAt: -1
        });


    return res.json({

      success: true,

      total:
        exams.length,

      exams

    });

  }

  catch (error: any) {

    console.log(
      "GET TEACHER EXAMS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to get exams"

    });

  }

};


// ============================================================
// GET PUBLISHED SUBJECT EXAMS
// ============================================================

export const getPublishedSubjectExams = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {
      subject,
      examType
    } = req.query;


    if (!subject) {

      return res.status(400).json({

        success: false,

        message:
          "Subject required"

      });

    }


    const filter: any = {

      subject:
        String(subject),

      status:
        "published",

      isPublished:
        true

    };


    // ========================================================
    // OPTIONAL NEET / JEE FILTER
    // ========================================================

    if (examType) {

      filter.targetExam =
        String(examType);

    }


    const exams =
      await Exam.find(filter)
        .sort({
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      count:
        exams.length,

      exams

    });

  }

  catch (error: any) {

    console.log(
      "GET PUBLISHED SUBJECT EXAMS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to get subject exams"

    });

  }

};


// ============================================================
// PUBLISH EXAM
// ============================================================

export const publishExam = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const exam =
      await Exam.findByIdAndUpdate(

        req.params.id,

        {

          status:
            "published",

          isPublished:
            true

        },

        {

          new: true

        }

      );


    if (!exam) {

      return res.status(404).json({

        success: false,

        message:
          "Exam not found"

      });

    }


    return res.json({

      success: true,

      message:
        "Exam published successfully",

      exam

    });

  }

  catch (error: any) {

    console.log(
      "PUBLISH EXAM ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to publish exam"

    });

  }

};


// ============================================================
// START EXAM
// ============================================================

export const startExam = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {
      studentId,
      examId
    } = req.body;


    if (
      !studentId ||
      !examId
    ) {

      return res.status(400).json({

        success: false,

        message:
          "StudentId and ExamId required"

      });

    }


    // ========================================================
    // FIND EXAM
    // ========================================================

    const exam =
      await Exam.findById(
        examId
      );


    if (!exam) {

      return res.status(404).json({

        success: false,

        message:
          "Exam not found"

      });

    }


    // ========================================================
    // CHECK PUBLISHED
    // ========================================================

    if (
      exam.status !== "published" &&
      exam.isPublished !== true
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Exam is not published"

      });

    }


    // ========================================================
    // FIND QUESTIONS
    // ========================================================

    const questions =
      await QuestionBank.find({

        _id: {
          $in:
            exam.questions
        },

        isPublished:
          true

      });


    if (
      questions.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          `No published ${exam.subject} questions found`

      });

    }


    // ========================================================
    // CREATE SESSION
    // ========================================================

    const session =
      await ExamSession.create({

        studentId,

        examId,

        questions:
          questions.map(
            (q: any) =>
              q._id
          ),

        answers: [],

        score: 0,

        status:
          "started",

        startTime:
          new Date()

      });


    // ========================================================
    // DISPLAY QUESTIONS
    // ========================================================

    const displayQuestions =
      questions.map(
        (q: any) => ({

          questionId:
            q._id,

          questionNumber:
            q.questionNumber,

          question:
            q.question,

          options:
            Array.isArray(
              q.options
            )
              ? [
                  ...q.options
                ].sort(
                  () =>
                    Math.random() - 0.5
                )
              : [],

          subject:
            q.subject,

          chapter:
            q.chapter,

          imageUrl:
            q.imageUrl || ""

        })
      );


    return res.status(200).json({

      success: true,

      message:
        `${exam.subject} exam started`,

      sessionId:
        session._id,

      exam: {

        id:
          exam._id,

        title:
          exam.title,

        subject:
          exam.subject,

        chapter:
          exam.chapter,

        className:
          exam.className,

        examType:
          exam.examType,

        duration:
          exam.duration,

        totalQuestions:
          questions.length

      },

      questions:
        displayQuestions

    });

  }

  catch (error: any) {

    console.log(
      "START EXAM ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to start exam"

    });

  }

};


// ============================================================
// SUBMIT EXAM
// ============================================================

export const submitExam = async (
  req: Request,
  res: Response
): Promise<any> => {

  try {

    const {

      studentId,

      studentName,

      sessionId,

      answers,

      warnings,

      timeTaken

    } = req.body;


    if (
      !studentId ||
      !sessionId ||
      !Array.isArray(answers)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "StudentId, SessionId and Answers required"

      });

    }


    // ========================================================
    // FIND SESSION
    // ========================================================

    const session =
      await ExamSession.findById(
        sessionId
      );


    if (!session) {

      return res.status(404).json({

        success: false,

        message:
          "Exam session not found"

      });

    }


    // ========================================================
    // CHECK SESSION OWNER
    // ========================================================

    if (
      String(session.studentId) !==
      String(studentId)
    ) {

      return res.status(403).json({

        success: false,

        message:
          "This exam session does not belong to this student"

      });

    }


    // ========================================================
    // PREVENT DOUBLE SUBMISSION
    // ========================================================

    if (
      session.status ===
      "completed"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Exam already submitted"

      });

    }


    // ========================================================
    // FIND EXAM
    // ========================================================

    const exam =
      await Exam.findById(
        session.examId
      );


    if (!exam) {

      return res.status(404).json({

        success: false,

        message:
          "Exam not found"

      });

    }


    // ========================================================
    // COUNTERS
    // ========================================================

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let attemptedQuestions = 0;

    let unansweredQuestions = 0;

    let marks = 0;


    const review: any[] = [];


    // ========================================================
    // ANSWER MAP
    // ========================================================

    const answerMap =
      new Map<string, string>();


    for (
      const item of answers
    ) {

      if (
        item?.questionId
      ) {

        answerMap.set(

          String(
            item.questionId
          ),

          String(
            item.answer || ""
          )

        );

      }

    }


    // ========================================================
    // CHECK QUESTIONS
    // ========================================================

    for (
      const questionId
      of session.questions
    ) {

      const question =
        await QuestionBank.findById(
          questionId
        );


      if (!question) {

        continue;

      }


      const selectedAnswer =
        answerMap.get(
          String(
            question._id
          )
        ) || "";


      const cleanSelected =
        selectedAnswer.trim();


      const cleanCorrect =
        String(
          question.correctAnswer || ""
        ).trim();


      // ======================================================
      // UNANSWERED
      // ======================================================

      if (
        cleanSelected === ""
      ) {

        unansweredQuestions++;

        review.push({

          questionId:
            question._id,

          question:
            question.question,

          selectedAnswer:
            "",

          correctAnswer:
            question.correctAnswer,

          isCorrect:
            false,

          marks:
            0

        });

        continue;

      }


      // ======================================================
      // ATTEMPTED
      // ======================================================

      attemptedQuestions++;


      const isCorrect =
        cleanSelected ===
        cleanCorrect;


      if (isCorrect) {

        correctAnswers++;

        marks += 1;

      }

      else {

        wrongAnswers++;

      }


      review.push({

        questionId:
          question._id,

        question:
          question.question,

        selectedAnswer:
          cleanSelected,

        correctAnswer:
          question.correctAnswer,

        isCorrect,

        marks:
          isCorrect
            ? 1
            : 0

      });

    }


    // ========================================================
    // TOTAL
    // ========================================================

    const totalQuestions =
      session.questions.length;


    // ========================================================
    // PERCENTAGE
    // ========================================================

    const percentage =
      totalQuestions > 0

        ? Number(

            (
              (
                marks /
                totalQuestions
              ) * 100

            ).toFixed(2)

          )

        : 0;


    // ========================================================
    // GRADE
    // ========================================================

    let grade = "F";


    if (percentage >= 90)
      grade = "A+";

    else if (percentage >= 80)
      grade = "A";

    else if (percentage >= 70)
      grade = "B";

    else if (percentage >= 60)
      grade = "C";

    else if (percentage >= 50)
      grade = "D";


    // ========================================================
    // STATUS
    // ========================================================

    const status =
      percentage >= 40
        ? "PASS"
        : "FAIL";


    // ========================================================
    // CATEGORY
    // ========================================================

    const testCategory =
      exam.examType === "daily"
        ? "daily"
        : exam.examType === "subject"
        ? "subject"
        : "mock";


    // ========================================================
    // RESULT RELEASE
    // ========================================================

    let resultAvailableAt:
      Date;

    let isResultPublished:
      boolean;


    if (
      testCategory === "mock"
    ) {

      resultAvailableAt =
        new Date();

      resultAvailableAt.setDate(
        resultAvailableAt.getDate() + 1
      );

      resultAvailableAt.setHours(
        8,
        0,
        0,
        0
      );

      isResultPublished =
        false;

    }

    else {

      resultAvailableAt =
        new Date();

      isResultPublished =
        true;

    }


    // ========================================================
    // CREATE RESULT
    // ========================================================

    const result =
      await Result.create({

        studentId,

        studentName:
          studentName || "",

        examId:
          session.examId,

        examName:
          exam.title ||
          "Exam",

        testCategory,

        subject:
          exam.subject ||
          "General",

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
          Number(timeTaken) || 0,

        warnings:
          Number(warnings) || 0,

        rank:
          0,

        resultAvailableAt,

        isResultPublished,

        review

      });


    // ========================================================
    // COMPLETE SESSION
    // ========================================================

    session.answers =
      answers.map(
        (item: any) => ({

          questionId:
            String(
              item.questionId
            ),

          answer:
            String(
              item.answer || ""
            )

        })
      );

    session.score =
      marks;

    session.status =
      "completed";

    session.endTime =
      new Date();


    await session.save();


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({

      success: true,

      message:
        `${exam.subject} exam submitted successfully`,

      result: {

        id:
          result._id,

        examId:
          result.examId,

        examName:
          result.examName,

        testCategory:
          result.testCategory,

        subject:
          result.subject,

        totalQuestions:
          result.totalQuestions,

        attemptedQuestions:
          result.attemptedQuestions,

        unansweredQuestions:
          result.unansweredQuestions,

        correctAnswers:
          result.correctAnswers,

        wrongAnswers:
          result.wrongAnswers,

        marks:
          result.marks,

        percentage:
          result.percentage,

        grade:
          result.grade,

        status:
          result.status,

        timeTaken:
          result.timeTaken,

        warnings:
          result.warnings,

        resultAvailableAt:
          result.resultAvailableAt,

        isResultPublished:
          result.isResultPublished,

        review:
          result.review

      }

    });

  }

  catch (error: any) {

    console.log(
      "SUBMIT EXAM ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Failed to submit exam"

    });

  }

};