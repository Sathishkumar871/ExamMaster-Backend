import Groq from "groq-sdk";
import QuestionBank from "../models/questionModel";

// ============================================================
// GROQ CLIENT
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

interface AIQuestionIssue {
  field: string;

  message: string;

  severity:
    | "low"
    | "medium"
    | "high";

  resolved: boolean;
}

interface AIVerificationResult {
  aiStatus:
    | "correct"
    | "wrong";

  aiIssues: AIQuestionIssue[];

  aiExplanation: string;
}

// ============================================================
// SAFE JSON PARSER
// ============================================================

const parseAIResponse = (
  content: string
): AIVerificationResult => {
  try {
    let cleaned = content.trim();

    // Remove markdown JSON block if AI returns it
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      aiStatus:
        parsed.aiStatus === "correct"
          ? "correct"
          : "wrong",

      aiIssues:
        Array.isArray(parsed.aiIssues)
          ? parsed.aiIssues.map(
              (issue: any) => ({
                field:
                  String(
                    issue.field || "unknown"
                  ),

                message:
                  String(
                    issue.message ||
                      "Possible issue found"
                  ),

                severity:
                  issue.severity === "high" ||
                  issue.severity === "low"
                    ? issue.severity
                    : "medium",

                resolved: false,
              })
            )
          : [],

      aiExplanation:
        String(
          parsed.aiExplanation || ""
        ),
    };
  } catch (error) {
    console.log(
      "AI JSON PARSE ERROR:",
      error
    );

    return {
      aiStatus: "wrong",

      aiIssues: [
        {
          field: "ai_response",
          message:
            "AI verification response could not be parsed.",
          severity: "high",
          resolved: false,
        },
      ],

      aiExplanation:
        "AI verification failed because the response format was invalid.",
    };
  }
};

// ============================================================
// VERIFY ONE QUESTION
// ============================================================

export const verifyQuestionWithAI =
  async (
    questionId: string
  ): Promise<AIVerificationResult> => {
    // ========================================================
    // FIND QUESTION
    // ========================================================

    const question =
      await QuestionBank.findById(
        questionId
      );

    if (!question) {
      throw new Error(
        "Question not found"
      );
    }

    // ========================================================
    // BASIC VALIDATION BEFORE AI
    // ========================================================

    const basicIssues: AIQuestionIssue[] =
      [];

    // Question empty
    if (
      !question.question ||
      !question.question.trim()
    ) {
      basicIssues.push({
        field: "question",
        message:
          "Question text is empty.",
        severity: "high",
        resolved: false,
      });
    }

    // Options count
    if (
      !Array.isArray(
        question.options
      ) ||
      question.options.length !== 4
    ) {
      basicIssues.push({
        field: "options",
        message:
          "Question must contain exactly 4 options.",
        severity: "high",
        resolved: false,
      });
    }

    // Empty option
    question.options?.forEach(
      (option, index) => {
        if (
          !option ||
          !option.trim()
        ) {
          basicIssues.push({
            field: `option_${index + 1}`,
            message:
              `Option ${
                index + 1
              } is empty.`,
            severity: "high",
            resolved: false,
          });
        }
      }
    );

    // Correct answer missing
    if (
      !question.correctAnswer ||
      !question.correctAnswer.trim()
    ) {
      basicIssues.push({
        field: "correctAnswer",
        message:
          "Correct answer is missing.",
        severity: "high",
        resolved: false,
      });
    }

    // ========================================================
    // SEND QUESTION TO GROQ
    // ========================================================

    const prompt = `
You are an expert NEET/JEE examination question reviewer.

Your job is ONLY to VERIFY the question.

IMPORTANT:
- Do NOT rewrite the question.
- Do NOT change the options.
- Do NOT change the correct answer.
- Do NOT fix anything.
- Only identify mistakes.
- Check factual correctness.
- Check whether the question is logically valid.
- Check whether exactly one option can be the correct answer.
- Check whether the stated correct answer is actually correct.
- Check grammar and clarity.
- Check duplicate or confusing options.
- Check mathematical/scientific notation if applicable.
- Check whether the question is suitable for the selected subject and exam.
- If everything is correct, return aiStatus = "correct".
- If there is any problem, return aiStatus = "wrong".

QUESTION:

${question.question}

OPTIONS:

1. ${question.options?.[0] || ""}
2. ${question.options?.[1] || ""}
3. ${question.options?.[2] || ""}
4. ${question.options?.[3] || ""}

CORRECT ANSWER:

${question.correctAnswer}

ANSWER NUMBER:

${question.ansNumber || "Not provided"}

SUBJECT:

${question.subject}

CHAPTER:

${question.chapter || "Not provided"}

EXAM:

${question.examType}

ACADEMIC YEAR:

${question.academicYear}

TARGET LEVEL:

${question.targetExamLevel}

Return ONLY valid JSON.

Required JSON format:

{
  "aiStatus": "correct" | "wrong",

  "aiIssues": [
    {
      "field": "question | option_1 | option_2 | option_3 | option_4 | correctAnswer | ansNumber | subject | chapter | other",

      "message": "Explain the exact mistake",

      "severity": "low | medium | high"
    }
  ],

  "aiExplanation": "Short explanation of the verification result"
}

If there are no mistakes:

{
  "aiStatus": "correct",
  "aiIssues": [],
  "aiExplanation": "Question, options and answer are valid."
}
`;

    // ========================================================
    // GROQ REQUEST
    // ========================================================

    const completion =
      await groq.chat.completions.create(
        {
          model:
            process.env.GROQ_MODEL ||
            "llama-3.3-70b-versatile",

          temperature: 0,

          max_completion_tokens: 2000,

          messages: [
            {
              role: "system",
              content:
                "You are a strict examination question verification system. Return only valid JSON.",
            },

            {
              role: "user",
              content: prompt,
            },
          ],
        }
      );

    // ========================================================
    // GET AI RESPONSE
    // ========================================================

    const content =
      completion.choices[0]
        ?.message?.content || "";

    console.log(
      "AI VERIFICATION RESPONSE:",
      content
    );

    // ========================================================
    // PARSE RESPONSE
    // ========================================================

    const aiResult =
      parseAIResponse(content);

    // ========================================================
    // MERGE BASIC ISSUES + AI ISSUES
    // ========================================================

    const combinedIssues = [
      ...basicIssues,
      ...aiResult.aiIssues,
    ];

    const finalStatus =
      combinedIssues.length > 0
        ? "wrong"
        : aiResult.aiStatus;

    const finalExplanation =
      combinedIssues.length > 0
        ? aiResult.aiExplanation ||
          "One or more issues were found in this question."
        : aiResult.aiExplanation ||
          "Question verified successfully.";

    // ========================================================
    // SAVE ONLY VERIFICATION RESULT
    // ========================================================

    await QuestionBank.findByIdAndUpdate(
      questionId,
      {
        aiVerified: true,

        aiStatus: finalStatus,

        aiIssues: combinedIssues,

        aiExplanation:
          finalExplanation,

        aiCheckedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // ========================================================
    // RETURN RESULT
    // ========================================================

    return {
      aiStatus: finalStatus,

      aiIssues: combinedIssues,

      aiExplanation:
        finalExplanation,
    };
  };

// ============================================================
// VERIFY MULTIPLE QUESTIONS
// ============================================================

export const verifyQuestionsWithAI =
  async (
    questionIds: string[]
  ) => {
    const results = [];

    for (
      const questionId of questionIds
    ) {
      try {
        const result =
          await verifyQuestionWithAI(
            questionId
          );

        results.push({
          questionId,
          success: true,
          ...result,
        });
      } catch (error: any) {
        results.push({
          questionId,
          success: false,
          error:
            error.message ||
            "Verification failed",
        });
      }
    }

    return results;
  };