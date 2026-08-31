import Groq from "groq-sdk";

// ============================================================
// GROQ CLIENT
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

export interface StudyGuide {
  title: string;
  subject: string;
  chapter: string;
  lesson: string;
  points: string[];
  formulas: string[];
  examTips: string[];
}

export interface AIQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// ============================================================
// SAFE JSON PARSER
// ============================================================

const parseAIJson = (content: string) => {
  try {
    // Direct JSON
    return JSON.parse(content);
  } catch {
    let cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON object
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      // Fix invalid escape characters
      cleaned = cleaned.replace(
        /\\(?!["\\/bfnrtu])/g,
        "\\\\"
      );

      try {
        return JSON.parse(cleaned);
      } catch (error: any) {
        console.error(
          "❌ AI JSON Parse Error:",
          error?.message
        );

        console.error(
          "❌ Raw AI Response:",
          content
        );

        throw new Error(
          `AI returned invalid JSON: ${error?.message}`
        );
      }
    }
  }
};

// ============================================================
// GENERATE STUDY GUIDE
// ============================================================

export const generateStudyGuide = async ({
  subject,
  chapter,
  lesson,
}: {
  subject: string;
  chapter: string;
  lesson?: string;
}): Promise<StudyGuide> => {
  const prompt = `
You are ExamMaster AI, an expert academic tutor.

Create a useful and accurate study guide for a student.

SUBJECT:
${subject}

CHAPTER:
${chapter}

LESSON / TOPIC:
${lesson || "Not specifically provided"}

Create:

1. Exactly 20 important points.
2. Important formulas or facts.
3. Important exam tips.

Rules:

- Make the content academically accurate.
- Keep the explanation student-friendly.
- Focus on important exam concepts.
- Avoid duplicate points.
- Include definitions where important.
- Include important relationships and concepts.
- Include common mistakes where useful.
- Do not add unnecessary introduction.
- Do not invent formulas.
- If formulas are not applicable, return useful key facts instead.
- The 20 points should actually teach the student the topic.
- The content should help the student answer MCQ questions later.

Return ONLY valid JSON.

IMPORTANT:
- points must contain exactly 20 items.
- Do not return markdown.
- Do not return code fences.
- Do not use invalid backslash escape characters.

Required JSON structure:

{
  "title": "Topic title",
  "subject": "${subject}",
  "chapter": "${chapter}",
  "lesson": "${lesson || ""}",
  "points": [
    "point 1",
    "point 2"
  ],
  "formulas": [
    "formula or important fact"
  ],
  "examTips": [
    "exam tip 1"
  ]
}
`;

  // ============================================================
  // GROQ - FAST MODEL
  // ============================================================

  const completion =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",

      temperature: 0.2,

      max_tokens: 4000,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content:
            "You are a precise academic AI tutor. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

  const content =
    completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq did not return a study guide."
    );
  }

  const result = parseAIJson(content);

  if (
    !result ||
    !Array.isArray(result.points) ||
    result.points.length !== 20
  ) {
    throw new Error(
      "Invalid study guide received from AI. Expected exactly 20 points."
    );
  }

  return {
    title:
      result.title ||
      lesson ||
      chapter,

    subject:
      result.subject ||
      subject,

    chapter:
      result.chapter ||
      chapter,

    lesson:
      result.lesson ||
      lesson ||
      "",

    points:
      result.points,

    formulas:
      Array.isArray(result.formulas)
        ? result.formulas
        : [],

    examTips:
      Array.isArray(result.examTips)
        ? result.examTips
        : [],
  };
};

// ============================================================
// GENERATE AI QUESTIONS
// ============================================================

export const generateAIQuestions = async ({
  subject,
  chapter,
  lesson,
  difficulty,
  count,
  studyGuide,
}: {
  subject: string;
  chapter: string;
  lesson?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  count: number;
  studyGuide: StudyGuide;
}): Promise<AIQuestion[]> => {
  const safeCount = Math.min(
    Math.max(count, 5),
    20
  );

  const prompt = `
You are ExamMaster AI, an expert exam question generator.

Generate exactly ${safeCount} multiple-choice questions.

SUBJECT:
${subject}

CHAPTER:
${chapter}

LESSON:
${lesson || "Not specifically provided"}

DIFFICULTY:
${difficulty}

STUDY GUIDE:
${JSON.stringify(studyGuide)}

QUESTION REQUIREMENTS:

- Every question must be based on the study guide.
- Questions must be academically accurate.
- Each question must have exactly 4 options.
- Only ONE option must be correct.
- Mix conceptual, application and exam-style questions.
- Avoid duplicate questions.
- Avoid ambiguous questions.
- Do not make the correct answer obvious from option length.
- Do not use "all of the above".
- Do not use "none of the above".
- Include a short explanation for every answer.
- correctAnswer must be the ZERO-BASED option index.
- Do not include markdown.
- Do not use invalid backslash escape characters.

Return ONLY valid JSON.

Required format:

{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct."
    }
  ]
}

IMPORTANT:

- Return exactly ${safeCount} questions.
- Each question must contain exactly 4 options.
`;

  // ============================================================
  // GROQ - FAST MODEL
  // ============================================================

  const completion =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",

      temperature: 0.3,

      max_tokens: 6000,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content:
            "You are an expert exam question generator. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

  const content =
    completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq did not return questions."
    );
  }

  const result = parseAIJson(content);

  if (
    !result ||
    !Array.isArray(result.questions)
  ) {
    throw new Error(
      "Invalid questions received from AI."
    );
  }

  if (
    result.questions.length !==
    safeCount
  ) {
    throw new Error(
      `AI returned ${result.questions.length} questions instead of ${safeCount}.`
    );
  }

  const questions: AIQuestion[] =
    result.questions.map(
      (item: any, index: number) => {

        if (
          !item.question ||
          !Array.isArray(item.options) ||
          item.options.length !== 4 ||
          typeof item.correctAnswer !==
            "number" ||
          item.correctAnswer < 0 ||
          item.correctAnswer > 3
        ) {
          throw new Error(
            `Invalid question format at question ${
              index + 1
            }.`
          );
        }

        return {
          id:
            item.id ||
            `ai-${Date.now()}-${index}`,

          question:
            item.question,

          options:
            item.options,

          correctAnswer:
            item.correctAnswer,

          explanation:
            item.explanation || "",
        };
      }
    );

  return questions;
};