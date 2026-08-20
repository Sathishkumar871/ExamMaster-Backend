import { Request, Response } from "express";
import Question from "../models/questionModel";

// ============================================================
// DEDICATED MOCK TEST CONTROLLER 
// ============================================================

export const getMockTestQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { className, academicYear, examType, subject } = req.query;
    const targetClass = (className || academicYear) as string;

    let andConditions: any[] = [
      { isPublished: true },
      { 
        $or: [
          { testCategory: { $regex: /^mock$/i } },
          { category: { $regex: /^mock$/i } }
        ] 
      }
    ];

    // 1. Exam Type Filter (NEET, JEE, etc.)
    if (examType && examType !== "All" && examType !== "undefined" && examType !== "") {
      const cleanExam = (examType as string).trim();
      andConditions.push({
        $or: [
          { examType: { $regex: new RegExp(`^${cleanExam}$`, "i") } },
          { exam: { $regex: new RegExp(`^${cleanExam}$`, "i") } }
        ]
      });
    }

    // 2. Class Name Filter (Handles spaces like "2nd PUC")
    if (targetClass && targetClass !== "All" && targetClass !== "undefined" && targetClass !== "") {
      const trimmedClass = targetClass.trim();
      const regexClass = trimmedClass.replace(/\s+/g, "\\s*");
      
      andConditions.push({
        $or: [
          { className: { $regex: new RegExp(regexClass, "i") } },
          { class: { $regex: new RegExp(regexClass, "i") } }
        ]
      });
    }

    // 3. Subject Filter (Optional)
    if (subject && subject !== "All" && subject !== "undefined" && subject !== "") {
      andConditions.push({
        subject: { $regex: new RegExp(`^${subject}$`, "i") }
      });
    }

    const query = { $and: andConditions };

    console.log("🔍 Final MongoDB Query:", JSON.stringify(query, null, 2));

    const questions = await Question.find(query).sort({
      globalQuestionNumber: 1,
    });

    console.log(`🎯 Mock Test Dedicated Controller - Questions Found: ${questions.length}`);

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("MOCK TEST CONTROLLER ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};