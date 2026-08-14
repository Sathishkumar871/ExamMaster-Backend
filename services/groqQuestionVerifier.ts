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

export interface ParsedQuestionInput {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;
}

export interface GroqQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;
}

// ============================================================
// BATCH SETTINGS
// ============================================================

// IMPORTANT:
// PDF ni small batches ga Groq ki pampistunnam.
// 20 questions per batch is generally safe.
//
// If questions are very large, reduce this to 10 or 15.

const BATCH_SIZE = 20;

// Small delay between requests.
// This helps avoid TPM/RPM rate-limit problems.

const BATCH_DELAY_MS = 1500;

// ============================================================
// DELAY
// ============================================================

const delay = (
  ms: number
): Promise<void> => {

  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );

};

// ============================================================
// NORMALIZE ANSWER
// ============================================================

const normalizeAnswer = (
  answer: string
): {
  correctAnswer: string;
  ansNumber: string;
} => {

  const value =
    String(answer || "")
      .trim()
      .toUpperCase();

  if (
    value === "A" ||
    value === "1"
  ) {

    return {
      correctAnswer: "A",
      ansNumber: "1",
    };

  }

  if (
    value === "B" ||
    value === "2"
  ) {

    return {
      correctAnswer: "B",
      ansNumber: "2",
    };

  }

  if (
    value === "C" ||
    value === "3"
  ) {

    return {
      correctAnswer: "C",
      ansNumber: "3",
    };

  }

  if (
    value === "D" ||
    value === "4"
  ) {

    return {
      correctAnswer: "D",
      ansNumber: "4",
    };

  }

  return {
    correctAnswer: "",
    ansNumber: "",
  };

};

// ============================================================
// CLEAN OPTION
// ============================================================

const cleanOption = (
  option: any
): string => {

  return String(option || "")
    .replace(
      /^\s*(?:\(?[A-D1-4]\)?[.)\-:]?)\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

};

// ============================================================
// CLEAN QUESTION
// ============================================================

const cleanQuestion = (
  question: any
): string => {

  return String(question || "")
    .replace(/\s+/g, " ")
    .trim();

};

// ============================================================
// CLEAN GROQ RESPONSE
// ============================================================

const cleanGroqResponse = (
  response: string
): string => {

  return response
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

};

// ============================================================
// NORMALIZE GROQ QUESTIONS
// ============================================================

const normalizeGroqQuestions = (
  parsed: any
): GroqQuestion[] => {

  if (
    !parsed ||
    !Array.isArray(
      parsed.questions
    )
  ) {

    return [];

  }

  const questions: GroqQuestion[] =
    parsed.questions

      .map(
        (
          item: any,
          index: number
        ) => {

          // ==================================================
          // OPTIONS
          // ==================================================

          const options =
            Array.isArray(
              item.options
            )
              ? item.options
                  .slice(0, 4)
                  .map(
                    (
                      option: any
                    ) =>
                      cleanOption(
                        option
                      )
                  )
                  .filter(
                    (
                      option: string
                    ) =>
                      option.length > 0
                  )
              : [];

          // ==================================================
          // ANSWER
          // ==================================================

          const answer =
            normalizeAnswer(
              item.correctAnswer ||
              item.ansNumber ||
              ""
            );

          // ==================================================
          // QUESTION
          // ==================================================

          return {

            questionNumber:
              Number(
                item.questionNumber
              ) ||
              index + 1,

            question:
              cleanQuestion(
                item.question
              ),

            options,

            correctAnswer:
              answer.correctAnswer,

            ansNumber:
              answer.ansNumber,

            questionType:
              "MCQ",

          };

        }
      )

      .filter(
        (
          question: GroqQuestion
        ) => {

          return (

            question.question.length >
              0 &&

            question.options.length ===
              4

          );

        }
      );

  return questions;

};

// ============================================================
// CREATE BATCHES
// ============================================================

const createBatches = <T>(
  items: T[],
  batchSize: number
): T[][] => {

  const batches: T[][] = [];

  for (
    let i = 0;
    i < items.length;
    i += batchSize
  ) {

    batches.push(
      items.slice(
        i,
        i + batchSize
      )
    );

  }

  return batches;

};

// ============================================================
// BUILD BATCH PROMPT
// ============================================================

const buildBatchPrompt = (
  batchPdfText: string,
  batchQuestions: ParsedQuestionInput[],
  batchNumber: number,
  totalBatches: number
): string => {

  const parserData =
    JSON.stringify(
      batchQuestions,
      null,
      2
    );

  return `

You are an expert examination PDF verification
and question reconstruction AI.

This is BATCH ${batchNumber} of ${totalBatches}.

You are given TWO SOURCES.

========================================================
SOURCE 1 — ORIGINAL PDF TEXT FOR THIS BATCH
========================================================

${batchPdfText}

========================================================
SOURCE 1 END
========================================================


========================================================
SOURCE 2 — REGEX PARSER RESULT FOR THIS BATCH
========================================================

${parserData}

========================================================
SOURCE 2 END
========================================================


========================================================
IMPORTANT RULES
========================================================

1. The ORIGINAL PDF TEXT is the primary source.

2. The regex parser result is helper data.

3. Compare both sources carefully.

4. Correct obvious PDF extraction mistakes.

5. Correct broken question numbers.

6. Correct question text split across lines.

7. Correct option text split across lines.

8. Remove page numbers.

9. Remove repeated headers.

10. Remove repeated footers.

11. Remove unrelated instructions.

12. Preserve mathematical expressions.

13. Preserve scientific symbols.

14. Preserve units.

15. Preserve special characters.

16. Preserve the original meaning.

17. DO NOT invent questions.

18. DO NOT invent options.

19. DO NOT invent answers.

20. If an answer key exists in the source,
    use the answer key.

21. If answer is A/B/C/D,
    preserve it.

22. If answer is 1/2/3/4,
    convert:

    1 → A
    2 → B
    3 → C
    4 → D

23. If no answer exists,
    return:

    "correctAnswer": "",
    "ansNumber": ""

24. Every valid MCQ must have exactly
    4 options.

25. questionType must always be:

    "MCQ"

26. Do not add explanations.

27. Do not add comments.

28. Do not add markdown.

29. Return ONLY JSON.

30. Do not use general knowledge to silently
    change questions or answers.

31. Only correct extraction errors when
    the source text supports the correction.

32. Preserve the original question numbers
    whenever possible.

========================================================
QUESTION FORMATS
========================================================

1) Question

1. Question

Q1. Question

Q1) Question

Q.1 Question

Question 1. Question

========================================================
OPTION FORMATS
========================================================

A) Option

B) Option

C) Option

D) Option

(A) Option

(B) Option

(C) Option

(D) Option

1) Option

2) Option

3) Option

4) Option

1. Option

2. Option

3. Option

4. Option

========================================================
ANSWER FORMATS
========================================================

Answer: A

Answer: B

Answer: C

Answer: D

Answer: 1

Answer: 2

Answer: 3

Answer: 4

Ans: A

Correct Answer: B

Correct: C

========================================================
OUTPUT FORMAT
========================================================

{
  "questions": [
    {
      "questionNumber": 1,
      "question": "Complete question",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": "A",
      "ansNumber": "1",
      "questionType": "MCQ"
    }
  ]
}

Return ONLY the JSON object.

Do not include markdown.

Do not include explanations.

Do not include comments.

`;

};

// ============================================================
// ANALYZE SINGLE BATCH
// ============================================================

const analyzeSingleBatch = async (
  batchPdfText: string,
  batchQuestions: ParsedQuestionInput[],
  batchNumber: number,
  totalBatches: number
): Promise<GroqQuestion[]> => {

  console.log(
    `🤖 GROQ BATCH ${batchNumber}/${totalBatches} STARTED`
  );

  console.log(
    `📝 QUESTIONS IN BATCH: ${batchQuestions.length}`
  );

  console.log(
    `📄 TEXT LENGTH: ${batchPdfText.length}`
  );

  const prompt =
    buildBatchPrompt(
      batchPdfText,
      batchQuestions,
      batchNumber,
      totalBatches
    );

  try {

    const completion =
      await groq.chat.completions.create({

        model:
          "llama-3.3-70b-versatile",

        temperature:
          0,

        response_format: {
          type:
            "json_object",
        },

        messages: [

          {
            role:
              "system",

            content:
              "You are an expert examination PDF parser and verifier. Return JSON only.",
          },

          {
            role:
              "user",

            content:
              prompt,
          },

        ],

      });

    const content =
      completion
        .choices?.[0]
        ?.message
        ?.content;

    if (!content) {

      throw new Error(
        `Groq returned empty response for batch ${batchNumber}`
      );

    }

    console.log(
      `✅ GROQ BATCH ${batchNumber}/${totalBatches} RESPONSE RECEIVED`
    );

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
        `❌ GROQ JSON ERROR BATCH ${batchNumber}:`,
        error
      );

      console.error(
        "RAW RESPONSE:",
        content
      );

      throw new Error(
        `Groq returned invalid JSON for batch ${batchNumber}`
      );

    }

    const questions =
      normalizeGroqQuestions(
        parsed
      );

    console.log(
      `✅ VALID QUESTIONS FROM BATCH ${batchNumber}: ${questions.length}`
    );

    return questions;

  } catch (error: any) {

    console.error(
      `❌ GROQ BATCH ${batchNumber} FAILED:`,
      error?.message ||
      error
    );

    throw error;

  }

};

// ============================================================
// ANALYZE PDF WITH GROQ
// ============================================================
//
// SAME FUNCTION SIGNATURE AS BEFORE.
//
// questionController.ts DOES NOT NEED TO CHANGE.
//
// Internally:
// PDF
// ↓
// batches
// ↓
// Groq batch 1
// Groq batch 2
// Groq batch 3
// ↓
// combine
// ↓
// remove duplicates
// ↓
// sort
// ↓
// return
//
// ============================================================

export const analyzePDFWithGroq =
  async (
    pdfText: string,
    parsedQuestions: ParsedQuestionInput[]
  ): Promise<GroqQuestion[]> => {

    // ========================================================
    // VALIDATE PDF TEXT
    // ========================================================

    if (
      !pdfText ||
      !pdfText.trim()
    ) {

      throw new Error(
        "PDF text is empty"
      );

    }

    // ========================================================
    // CHECK API KEY
    // ========================================================

    if (
      !process.env.GROQ_API_KEY
    ) {

      throw new Error(
        "GROQ_API_KEY is missing in .env"
      );

    }

    // ========================================================
    // BASIC LOG
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "🤖 GROQ BATCH PDF VERIFICATION STARTED"
    );

    console.log(
      "PDF TEXT LENGTH:",
      pdfText.length
    );

    console.log(
      "REGEX QUESTIONS:",
      parsedQuestions.length
    );

    console.log(
      "BATCH SIZE:",
      BATCH_SIZE
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // NO PARSED QUESTIONS
    // ========================================================

    if (
      parsedQuestions.length === 0
    ) {

      throw new Error(
        "No parsed questions available for Groq verification"
      );

    }

    // ========================================================
    // CREATE QUESTION BATCHES
    // ========================================================

    const batches =
      createBatches(
        parsedQuestions,
        BATCH_SIZE
      );

    const totalBatches =
      batches.length;

    console.log(
      `📦 TOTAL BATCHES: ${totalBatches}`
    );

    // ========================================================
    // ALL FINAL QUESTIONS
    // ========================================================

    const allQuestions:
      GroqQuestion[] = [];

    // ========================================================
    // PROCESS EACH BATCH
    // ========================================================

    for (
      let i = 0;
      i < batches.length;
      i++
    ) {

      const batch =
        batches[i];

      const batchNumber =
        i + 1;

      // ======================================================
      // FIND QUESTION NUMBER RANGE
      // ======================================================

      const firstQuestion =
        batch[0]?.questionNumber ||
        1;

      const lastQuestion =
        batch[
          batch.length - 1
        ]?.questionNumber ||
        firstQuestion;

      console.log(
        `==========================================`
      );

      console.log(
        `📦 PROCESSING BATCH ${batchNumber}/${totalBatches}`
      );

      console.log(
        `📝 QUESTIONS: ${firstQuestion} - ${lastQuestion}`
      );

      console.log(
        `==========================================`
      );

      // ======================================================
      // BUILD BATCH PDF TEXT
      // ======================================================
      //
      // Instead of sending the COMPLETE PDF every time,
      // only send the relevant question section.
      //
      // We locate each parsed question in the extracted
      // PDF text and create a smaller text section.
      //
      // ======================================================

      let batchPdfText = "";

      for (
        const question of batch
      ) {

        const questionText =
          String(
            question.question ||
            ""
          ).trim();

        if (!questionText) {
          continue;
        }

        const normalizedQuestion =
          questionText
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        // Try exact-ish search in PDF text
        const position =
          pdfText
            .toLowerCase()
            .indexOf(
              normalizedQuestion
                .toLowerCase()
            );

        if (
          position >= 0
        ) {

          const start =
            Math.max(
              0,
              position - 150
            );

          const end =
            Math.min(
              pdfText.length,
              position +
              normalizedQuestion.length +
              1200
            );

          batchPdfText +=
            "\n" +
            pdfText.slice(
              start,
              end
            ) +
            "\n";

        }

      }

      // ======================================================
      // FALLBACK
      // ======================================================
      //
      // If exact question text was not found,
      // send parser data as the primary batch source.
      //
      // This prevents empty Groq requests.
      //
      // ======================================================

      if (
        !batchPdfText.trim()
      ) {

        batchPdfText =
          batch
            .map(
              (
                q
              ) =>
                `
Question ${q.questionNumber}:
${q.question}

A) ${q.options?.[0] || ""}
B) ${q.options?.[1] || ""}
C) ${q.options?.[2] || ""}
D) ${q.options?.[3] || ""}
`
            )
            .join(
              "\n"
            );

      }

      // ======================================================
      // ANALYZE BATCH
      // ======================================================

      const batchResult =
        await analyzeSingleBatch(
          batchPdfText,
          batch,
          batchNumber,
          totalBatches
        );

      // ======================================================
      // ADD RESULTS
      // ======================================================

      allQuestions.push(
        ...batchResult
      );

      console.log(
        `📥 TOTAL QUESTIONS SO FAR: ${allQuestions.length}`
      );

      // ======================================================
      // DELAY
      // ======================================================

      if (
        batchNumber <
        totalBatches
      ) {

        console.log(
          `⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...`
        );

        await delay(
          BATCH_DELAY_MS
        );

      }

    }

    // ========================================================
    // REMOVE DUPLICATES
    // ========================================================

    const uniqueQuestions =
      allQuestions.filter(
        (
          question,
          index,
          array
        ) => {

          return (
            index ===
            array.findIndex(
              (
                item
              ) =>
                item.questionNumber ===
                question.questionNumber
            )
          );

        }
      );

    // ========================================================
    // SORT
    // ========================================================

    uniqueQuestions.sort(
      (
        a,
        b
      ) =>
        a.questionNumber -
        b.questionNumber
    );

    // ========================================================
    // FINAL LOG
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "🤖 GROQ BATCH PROCESSING COMPLETED"
    );

    console.log(
      "📦 TOTAL BATCHES:",
      totalBatches
    );

    console.log(
      "📝 GROQ QUESTIONS:",
      allQuestions.length
    );

    console.log(
      "✅ UNIQUE QUESTIONS:",
      uniqueQuestions.length
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // NO RESULTS
    // ========================================================

    if (
      uniqueQuestions.length === 0
    ) {

      throw new Error(
        "Groq returned no valid questions from any batch"
      );

    }

    // ========================================================
    // RETURN
    // ========================================================

    return uniqueQuestions;

  };

