import { Request, Response } from "express";
import Question from "../models/questionModel";

export const getDailyTestQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { className, academicYear, subject } = req.query;
    const targetClass = (className || academicYear) as string;

    // 1. Base match condition for daily tests (NEET & JEE merged)
    let matchConditions: any = {
      isPublished: true,
      $or: [
        { testCategory: { $regex: /daily/i } },
        { category: { $regex: /daily/i } }
      ]
    };

    // 2. Class Name Filter (ఉదాహరణకు "2nd PUC" స్పేస్‌లతో సహా మ్యాచ్ అవ్వడానికి)
    if (targetClass && targetClass !== "All" && targetClass !== "undefined" && targetClass !== "") {
      const trimmedClass = targetClass.trim();
      const regexClass = trimmedClass.replace(/\s+/g, "\\s*");
      
      matchConditions.$and = matchConditions.$and || [];
      matchConditions.$and.push({
        $or: [
          { className: { $regex: new RegExp(regexClass, "i") } },
          { class: { $regex: new RegExp(regexClass, "i") } }
        ]
      });
    }

    // 3. Subject Filter (Optional)
    if (subject && subject !== "All" && subject !== "undefined" && subject !== "") {
      matchConditions.subject = { $regex: new RegExp(`^${subject}$`, "i") };
    }

    // 4. అగ్రిగేషన్ ద్వారా మొత్తం పూల్ నుండి రోజుకి 180 ప్రశ్నలను ర్యాండమ్‌గా పంపడం
    const questions = await Question.aggregate([
      { $match: matchConditions },
      { $sample: { size: 180 } }
    ]);

    console.log(`🎯 Daily Test Questions Sent: ${questions.length}`);

    res.status(200).json({
      success: true,
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("DAILY TEST CONTROLLER ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};