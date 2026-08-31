import { Request, Response } from "express";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

interface AcademicRequestBody {
  question?: string;
}

// ============================================================
// ASK ACADEMIC AI
// ============================================================

export const askAcademicAI = async (
  req: Request<{}, {}, AcademicRequestBody>,
  res: Response
) => {
  try {
    const question =
      typeof req.body?.question === "string"
        ? req.body.question.trim()
        : "";

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please enter an academic question.",
      });
    }

    if (question.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Question is too long. Please keep it under 5000 characters.",
      });
    }

    // --------------------------------------------------------
    // GROQ
    // --------------------------------------------------------

    const completion =
      await groq.chat.completions.create({
        model:
          process.env.GROQ_ACADEMIC_MODEL ||
          "openai/gpt-oss-20b",

        temperature: 0.25,

        max_tokens: 1800,

        reasoning_effort: "low",

        messages: [
          {
            role: "system",
            content: `
You are ExamMaster AI, a highly accurate academic tutor.

Your job is to answer ANY genuine academic question clearly and correctly.

You may help with:
- Physics
- Chemistry
- Biology
- Botany
- Zoology
- Mathematics
- Computer Science
- General academic concepts
- Exam preparation
- Numerical problems
- Concept clarification
- Definitions
- Comparisons
- Step-by-step solutions

IMPORTANT RULES:

1. Understand the student's actual question before answering.
2. Give a direct answer first.
3. Explain the concept in simple student-friendly language.
4. For numerical problems, show the solution step by step.
5. For science questions, use correct scientific terminology.
6. For mathematics, show the relevant formula and working.
7. Use examples when they genuinely help.
8. Highlight important exam points when useful.
9. Mention common mistakes when relevant.
10. Never invent facts, formulas, values, or laws.
11. If the student's question is unclear, explain what is unclear and answer the most reasonable interpretation.
12. Do not unnecessarily make the answer extremely long.
13. Do not use fake citations or pretend to have checked external sources.
14. Do not refuse a normal academic question merely because it is difficult.
15. Keep the response focused on learning.

RESPONSE STYLE:

- Start with the answer.
- Then explain.
- Use short sections when useful.
- Use bullet points sparingly.
- Use formulas where needed.
- Keep language clear and natural.
`,
          },
          {
            role: "user",
            content: question,
          },
        ],
      });

    // --------------------------------------------------------
    // AI RESPONSE
    // --------------------------------------------------------

    const answer =
      completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        success: false,
        message:
          "ExamMaster AI could not generate an answer right now.",
      });
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error(
      "❌ Academic AI Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Unable to process your academic question.",
    });
  }
};