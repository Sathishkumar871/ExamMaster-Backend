import { Request, Response } from "express";
import QuestionBank from "../models/questionModel";

// Escape Regex for safe search
const escapeRegex = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// ==============================
// GET DAILY TESTS FOR STUDENTS (Only Published Daily Tests)
// ==============================
export const getDailyTests = async (req: any, res: Response): Promise<void> => {
  try {
    const { subject, chapter } = req.query;
    
    // 🔍 కండిషన్: కేవలం డైలీ టెస్ట్‌లు మరియు పబ్లిష్ అయినవి మాత్రమే రావాలి
    const filter: any = { 
      testType: "daily", 
      isPublished: true 
    };

    if (subject && subject !== "All" && subject !== "undefined") {
      filter.subject = { $regex: new RegExp(`^${escapeRegex(subject.trim())}$`, "i") };
    }

    if (chapter && chapter !== "All" && chapter !== "undefined") {
      filter.chapter = { $regex: new RegExp(`^${escapeRegex(chapter.trim())}$`, "i") };
    }

    const tests = await QuestionBank.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      total: tests.length,
      tests, // స్టూడెంట్ ఫ్రంట్‌ఎండ్‌కి వెళ్లే డైలీ టెస్ట్ డేటా
    });
  } catch (error: any) {
    console.log("GET DAILY TESTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};