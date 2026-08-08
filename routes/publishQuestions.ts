import { Router, Request, Response } from 'express';
import QuestionBank from '../models/questionModel';

const router = Router();

router.post('/publish-questions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { questions, destination, subject, examTag } = req.body; 
    // destination: "daily" or "mockTest"

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "No questions provided to publish" });
    }

    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      subject: subject || "General",
      examTags: destination === "daily" ? ["daily"] : [examTag || "mockTest"],
      isPublished: true
    }));

    const saved = await QuestionBank.insertMany(formattedQuestions);

    return res.json({
      success: true,
      message: `Successfully published ${saved.length} questions to ${destination === 'daily' ? 'Daily Mock Tests' : 'Mock Tests'}!`,
      data: saved
    });

  } catch (err: any) {
    console.error("Publish Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;