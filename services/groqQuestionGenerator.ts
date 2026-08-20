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

export type TestCategory =
  | "mock"
  | "daily"
  | "subject";

export type ExamType =
  | "NEET"
  | "JEE";

export type AcademicYear =
  | "1st PUC"
  | "2nd PUC";

// ============================================================
// GENERATION REQUEST
// ============================================================

export interface GenerateQuestionRequest {
  subject: string;

  chapter: string;

  totalQuestions?: number;

  count?: number;

  difficulty?: string;

  examType?: ExamType;

  academicYear?: AcademicYear;

  questionType?: "MCQ";

  testCategory?: TestCategory;

  testTitle?: string;

  testId?: string;

  marksPerQuestion?: number;

  negativeMarks?: number;

  durationMinutes?: number;

  testDate?: string;

  testTime?: string;
}

// ============================================================
// GENERATED QUESTION
// ============================================================

export interface GeneratedQuestion {
  questionNumber: number;

  question: string;

  options: string[];

  correctAnswer: string;

  ansNumber: string;

  questionType: "MCQ";

  source: "groq";

  subject: string;

  chapter: string;

  difficulty: string;

  testCategory: TestCategory;

  testTitle: string;

  examType: ExamType;

  academicYear: AcademicYear;

  testId: string;

  marksPerQuestion: number;

  negativeMarks: number;

  durationMinutes: number;

  testDate: string;

  testTime: string;
}

// ============================================================
// SETTINGS
// ============================================================

const GENERATION_BATCH_SIZE = 10;

const BATCH_DELAY_MS = 1200;

const MAX_QUESTIONS = 180;

// ============================================================
// DELAY
// ============================================================

const delay = (
  ms: number
): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// ============================================================
// CHECK GROQ KEY
// ============================================================

const checkGroqKey = (): void => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing in .env"
    );
  }
};

// ============================================================
// CLEAN TEXT
// ============================================================

const cleanText = (
  value: unknown
): string => {
  return String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// CLEAN OPTION
// ============================================================

const cleanOption = (
  value: unknown
): string => {
  return String(value ?? "")
    .replace(
      /^\s*(?:\(?[A-D1-4]\)?[.)\-:]?)\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// NORMALIZE ANSWER
// ============================================================

const normalizeAnswer = (
  value: unknown
): {
  correctAnswer: string;
  ansNumber: string;
} => {

  const answer =
    String(value ?? "")
      .trim()
      .toUpperCase();

  switch (answer) {

    case "A":
    case "1":
      return {
        correctAnswer: "A",
        ansNumber: "1",
      };

    case "B":
    case "2":
      return {
        correctAnswer: "B",
        ansNumber: "2",
      };

    case "C":
    case "3":
      return {
        correctAnswer: "C",
        ansNumber: "3",
      };

    case "D":
    case "4":
      return {
        correctAnswer: "D",
        ansNumber: "4",
      };

    default:
      return {
        correctAnswer: "",
        ansNumber: "",
      };
  }
};

// ============================================================
// CLEAN GROQ RESPONSE
// ============================================================

const cleanGroqResponse = (
  value: string
): string => {

  return value
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

// ============================================================
// CREATE BATCHES
// ============================================================

const createBatches = (
  total: number,
  size: number
): number[][] => {

  const batches: number[][] = [];

  for (
    let start = 1;
    start <= total;
    start += size
  ) {

    const batch: number[] = [];

    const end =
      Math.min(
        start + size - 1,
        total
      );

    for (
      let number = start;
      number <= end;
      number++
    ) {
      batch.push(number);
    }

    batches.push(batch);
  }

  return batches;
};

// ============================================================
// GENERATION PROMPT
// ============================================================

const buildGenerationPrompt = (
  request: GenerateQuestionRequest,
  count: number,
  startNumber: number
): string => {

  return `
You are an expert examination question creator.

Create EXACTLY ${count} high-quality original MCQ questions.

============================================================
EXAM INFORMATION
============================================================

Subject:
${request.subject}

Chapter:
${request.chapter}

Exam:
${request.examType}

Academic Year:
${request.academicYear}

Difficulty:
${request.difficulty || "Medium"}

Test Category:
${request.testCategory || "subject"}

Test Title:
${request.testTitle || "Question Bank"}

============================================================
STRICT QUESTION RULES
============================================================

1. Generate EXACTLY ${count} questions.

2. Every question must have EXACTLY 4 options.

3. Every option must be meaningful.

4. Only ONE option must be correct.

5. correctAnswer must be A, B, C or D.

6. ansNumber must be:
   A = 1
   B = 2
   C = 3
   D = 4

7. Questions must strictly belong to:
   ${request.subject}

8. Questions must strictly belong to:
   ${request.chapter}

9. Match the requested difficulty.

10. Do not generate duplicate questions.

11. Do not generate questions with nearly
    identical meaning.

12. Do not use explanations.

13. Do not use markdown.

14. Do not use comments.

15. Do not put question numbers inside
    question text.

16. Do not put A), B), C), D) labels
    inside option text.

17. Do not create scientifically incorrect
    information.

18. For Mathematics and Physics,
    preserve mathematical expressions.

19. Questions should be suitable for
    ${request.examType} examination level.

20. Return ONLY JSON.

============================================================
QUESTION NUMBERING
============================================================

Start question numbering from:

${startNumber}

============================================================
OUTPUT FORMAT
============================================================

{
  "questions": [
    {
      "questionNumber": ${startNumber},
      "question": "Question text",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": "A",
      "ansNumber": "1"
    }
  ]
}

Return ONLY the JSON object.
`;
};

// ============================================================
// NORMALIZE GENERATED QUESTIONS
// ============================================================

const normalizeGeneratedQuestions = (
  data: any,
  request: GenerateQuestionRequest,
  startNumber: number
): GeneratedQuestion[] => {

  if (
    !data ||
    !Array.isArray(
      data.questions
    )
  ) {
    return [];
  }

  return data.questions
    .map(
      (
        item: any,
        index: number
      ): GeneratedQuestion => {

        const options =
          Array.isArray(
            item?.options
          )
            ? item.options
                .map(cleanOption)
                .filter(
                  (
                    option: string
                  ) =>
                    option.length > 0
                )
                .slice(0, 4)
            : [];

        const answer =
          normalizeAnswer(
            item?.correctAnswer ||
            item?.ansNumber
          );

        return {

          questionNumber:
            startNumber + index,

          question:
            cleanText(
              item?.question
            ),

          options,

          correctAnswer:
            answer.correctAnswer,

          ansNumber:
            answer.ansNumber,

          questionType:
            "MCQ",

          source:
            "groq",

          subject:
            cleanText(
              request.subject
            ),

          chapter:
            cleanText(
              request.chapter
            ),

          difficulty:
            cleanText(
              request.difficulty ||
              "Medium"
            ),

          testCategory:
            request.testCategory ||
            "subject",

          testTitle:
            cleanText(
              request.testTitle ||
              "Question Bank"
            ),

          examType:
            request.examType ||
            "NEET",

          academicYear:
            request.academicYear ||
            "2nd PUC",

          testId:
            request.testId ||
            "",

          marksPerQuestion:
            request.marksPerQuestion ??
            4,

          negativeMarks:
            request.negativeMarks ??
            1,

          durationMinutes:
            request.durationMinutes ??
            180,

          testDate:
            request.testDate ||
            "",

          testTime:
            request.testTime ||
            "",
        };
      }
    )
    .filter(
      (
        question:
          GeneratedQuestion
      ) =>
        question.question.length > 0 &&
        question.options.length === 4 &&
        question.correctAnswer !== ""
    );
};

// ============================================================
// GENERATE ONE BATCH
// ============================================================

const generateSingleBatch = async (
  request: GenerateQuestionRequest,
  count: number,
  startNumber: number,
  batchNumber: number,
  totalBatches: number
): Promise<GeneratedQuestion[]> => {

  console.log(
    `🤖 GROQ GENERATION ${batchNumber}/${totalBatches}`
  );

  console.log(
    `📝 Generating ${count} questions`
  );

  const prompt =
    buildGenerationPrompt(
      request,
      count,
      startNumber
    );

  const completion =
    await groq.chat.completions.create({

      model:
        "llama-3.3-70b-versatile",

      temperature:
        0.2,

      response_format:
        {
          type: "json_object",
        },

      messages: [

        {
          role: "system",

          content:
            "You are an expert examination question generator. Return JSON only.",
        },

        {
          role: "user",

          content:
            prompt,
        },

      ],
    });

  const content =
    completion
      .choices?.[0]
      ?.message?.content;

  if (!content) {

    throw new Error(
      `Groq returned empty response for generation batch ${batchNumber}`
    );
  }

  let parsed: any;

  try {

    parsed =
      JSON.parse(
        cleanGroqResponse(
          content
        )
      );

  } catch (error) {

    console.error(
      "RAW GROQ RESPONSE:",
      content
    );

    throw new Error(
      `Invalid JSON returned by Groq generation batch ${batchNumber}`
    );
  }

  const questions =
    normalizeGeneratedQuestions(
      parsed,
      request,
      startNumber
    );

  console.log(
    `✅ Batch generated: ${questions.length}`
  );

  return questions;
};

// ============================================================
// MAIN GENERATOR
// ============================================================

export const generateQuestionsWithGroq =
  async (
    request: GenerateQuestionRequest
  ): Promise<GeneratedQuestion[]> => {

    checkGroqKey();

    // --------------------------------------------------------
    // SUBJECT
    // --------------------------------------------------------

    if (
      !request.subject?.trim()
    ) {

      throw new Error(
        "Subject is required"
      );
    }

    // --------------------------------------------------------
    // CHAPTER
    // --------------------------------------------------------

    if (
      !request.chapter?.trim()
    ) {

      throw new Error(
        "Chapter is required"
      );
    }

    // --------------------------------------------------------
    // EXAM
    // --------------------------------------------------------

    const examType =
      request.examType ||
      "NEET";

    // --------------------------------------------------------
    // ACADEMIC YEAR
    // --------------------------------------------------------

    const academicYear =
      request.academicYear ||
      "2nd PUC";

    // --------------------------------------------------------
    // COUNT
    // --------------------------------------------------------

    const requestedCount =
      request.totalQuestions ??
      request.count ??
      1;

    const count =
      Math.min(
        Math.max(
          Number(
            requestedCount
          ) || 1,
          1
        ),
        MAX_QUESTIONS
      );

    // --------------------------------------------------------
    // NORMALIZED REQUEST
    // --------------------------------------------------------

    const normalizedRequest:
      GenerateQuestionRequest = {

      ...request,

      examType,

      academicYear,

      totalQuestions:
        count,

      count,
    };

    // --------------------------------------------------------
    // CREATE BATCHES
    // --------------------------------------------------------

    const batches =
      createBatches(
        count,
        GENERATION_BATCH_SIZE
      );

    console.log(
      "=========================================="
    );

    console.log(
      "🤖 GROQ QUESTION GENERATION"
    );

    console.log(
      "SUBJECT:",
      normalizedRequest.subject
    );

    console.log(
      "CHAPTER:",
      normalizedRequest.chapter
    );

    console.log(
      "EXAM:",
      examType
    );

    console.log(
      "ACADEMIC YEAR:",
      academicYear
    );

    console.log(
      "TEST CATEGORY:",
      normalizedRequest.testCategory ||
      "subject"
    );

    console.log(
      "TOTAL QUESTIONS:",
      count
    );

    console.log(
      "TOTAL BATCHES:",
      batches.length
    );

    console.log(
      "=========================================="
    );

    // --------------------------------------------------------
    // ALL QUESTIONS
    // --------------------------------------------------------

    const allQuestions:
      GeneratedQuestion[] = [];

    // --------------------------------------------------------
    // GENERATE BATCHES
    // --------------------------------------------------------

    for (
      let i = 0;
      i < batches.length;
      i++
    ) {

      const batch =
        batches[i];

      const startNumber =
        batch[0];

      const result =
        await generateSingleBatch(
          normalizedRequest,

          batch.length,

          startNumber,

          i + 1,

          batches.length
        );

      allQuestions.push(
        ...result
      );

      // ------------------------------------------------------
      // DELAY
      // ------------------------------------------------------

      if (
        i <
        batches.length - 1
      ) {

        await delay(
          BATCH_DELAY_MS
        );
      }
    }

    // ========================================================
    // REMOVE EXACT DUPLICATES
    // ========================================================

    const seen =
      new Set<string>();

    const unique:
      GeneratedQuestion[] = [];

    for (
      const question
      of allQuestions
    ) {

      const normalized =
        cleanText(
          question.question
        )
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          );

      if (!normalized) {
        continue;
      }

      if (
        seen.has(
          normalized
        )
      ) {
        continue;
      }

      seen.add(
        normalized
      );

      unique.push(
        question
      );
    }

    // ========================================================
    // FINAL NUMBERING
    // ========================================================

    unique.forEach(
      (
        question,
        index
      ) => {

        question.questionNumber =
          index + 1;
      }
    );

    // ========================================================
    // FINAL RESULT
    // ========================================================

    const finalQuestions =
      unique.slice(
        0,
        count
      );

    console.log(
      "=========================================="
    );

    console.log(
      "✅ GROQ GENERATION COMPLETED"
    );

    console.log(
      "REQUESTED:",
      count
    );

    console.log(
      "GENERATED:",
      allQuestions.length
    );

    console.log(
      "UNIQUE:",
      unique.length
    );

    console.log(
      "RETURNING:",
      finalQuestions.length
    );

    console.log(
      "=========================================="
    );

    return finalQuestions;
  };

// ============================================================
// EXPORT ALIAS
// ============================================================

export const generateQuestions =
  generateQuestionsWithGroq;