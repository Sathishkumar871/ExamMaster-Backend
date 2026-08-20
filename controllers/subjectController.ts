import { Request, Response } from "express";
import Question from "../models/questionModel";

export const getQuestionsBySubject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { className, academicYear, subject, testCategory } = req.query;
    const targetClass = (className || academicYear) as string;

    // అన్ని ఫిల్టర్లు ఒకేసారి అప్లై అవ్వడానికి $and కండిషన్స్ వాడటం
    const andConditions: any[] = [
      { isPublished: true }
    ];

    // 1. Test Category Filter (ఉదాహరణకు: 'daily' లేదా 'mock')
    if (testCategory && testCategory !== "All" && testCategory !== "undefined" && testCategory !== "") {
      andConditions.push({
        $or: [
          { testCategory: { $regex: new RegExp(testCategory as string, "i") } },
          { category: { $regex: new RegExp(testCategory as string, "i") } }
        ]
      });
    }

    // 2. Class Name Filter (ఉదాహరణకు: "2nd PUC")
    if (targetClass && targetClass !== "All" && targetClass !== "undefined" && targetClass !== "") {
      const trimmedClass = (targetClass as string).trim();
      const regexClass = trimmedClass.replace(/\s+/g, "\\s*");
      andConditions.push({
        $or: [
          { className: { $regex: new RegExp(regexClass, "i") } },
          { class: { $regex: new RegExp(regexClass, "i") } }
        ]
      });
    }

    // 3. Subject Filter (ఉదాహరణకు: "Chemistry", "Physics", "Mathematics")
    if (subject && subject !== "All" && subject !== "undefined" && subject !== "") {
      andConditions.push({
        subject: { $regex: new RegExp(`^${subject as string}$`, "i") }
      });
    }

    const matchConditions = { $and: andConditions };

    // అగ్రిగేషన్ ద్వారా పైన చెప్పిన అన్నీ మ్యాచ్ అయ్యే ప్రశ్నలను ర్యాండమ్‌గా తీసుకోవడం
    const questions = await Question.aggregate([
      { $match: matchConditions },
      { $sample: { size: 100 } } // అవసరమైతే సైజ్ మార్చుకోవచ్చు
    ]);

    console.log(`🎯 Filters -> Class: ${targetClass || "All"} | Subject: ${subject || "All"} | Category: ${testCategory || "All"} | Found: ${questions.length}`);

    res.status(200).json({
      success: true,
      className: targetClass || "All",
      subject: subject || "All",
      testCategory: testCategory || "All",
      total: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("SUBJECT CONTROLLER ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};