import express, { Request, Response } from "express";
import staffAuth from "../middleware/staffAuth"; // 👈 ఇక్కడ staffAuth ఇంపోర్ట్ చేయండి

const router = express.Router();

interface PublishTestBody {
  title: string;
  testType: "mock" | "daily" | "weekly";
  academicYear: "1st Year" | "2nd Year" | "Both";
  examDuration: number;
  examDate?: string | null;
  examTime?: string | null;
  subject: string;
  chapter?: string;
  questions: any[];
}

// 🚀 Publish Test Route (Head / Staff Allowed)
router.post(
  "/publish",
  staffAuth, // 👈 ఇక్కడ staffAuth మిడిల్‌వేర్ పెట్టండి (ఇందులో head కి కూడా పర్మిషన్ ఉంటుంది)
  async (req: Request<{}, {}, PublishTestBody>, res: Response): Promise<any> => {
    try {
      const {
        title,
        testType,
        academicYear,
        examDuration,
        examDate,
        examTime,
        subject,
        chapter,
        questions,
      } = req.body;

      if (!title || !questions || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Test title and questions are required!",
        });
      }

      // TODO: మీ డేటాబేస్‌లో టెస్ట్‌ని సేవ్ చేసే కోడ్ ఇక్కడ రాయండి

      return res.status(200).json({
        success: true,
        message: "Test published successfully by Staff/Head!",
      });
    } catch (error: any) {
      console.error("Publish Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while publishing test",
        error: error.message,
      });
    }
  }
);

export default router;