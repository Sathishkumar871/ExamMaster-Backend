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
// ANALYZE PDF WITH GROQ
// ============================================================
//
// IMPORTANT:
//
// Groq receives BOTH:
//
// 1. Original PDF extracted text
// 2. Regex parser result
//
// Groq compares both and fixes extraction mistakes.
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

    console.log(
      "=========================================="
    );

    console.log(
      "🤖 GROQ PDF VERIFICATION STARTED"
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
      "=========================================="
    );

    // ========================================================
    // PARSER DATA
    // ========================================================

    const parserData =
      JSON.stringify(
        parsedQuestions,
        null,
        2
      );

    // ========================================================
    // PROMPT
    // ========================================================

    const prompt = `

You are an expert examination PDF verification and
question reconstruction AI.

You are given TWO sources:

SOURCE 1:
Original text extracted from the PDF.

SOURCE 2:
Questions extracted by our local regex parser.

Your job is to compare BOTH sources and return the
MOST ACCURATE final MCQ questions.

========================================================
IMPORTANT RULES
========================================================

1. The ORIGINAL PDF TEXT is the primary source.

2. The regex parsed questions are only helper data.

3. Compare the original PDF text with the parsed questions.

4. Correct obvious PDF extraction mistakes.

5. Correct broken question numbers.

6. Correct question text split across multiple lines.

7. Correct option text split across multiple lines.

8. Remove PDF page numbers.

9. Remove repeated headers.

10. Remove repeated footers.

11. Remove unrelated instructions.

12. Preserve mathematical expressions.

13. Preserve scientific symbols.

14. Preserve units.

15. Preserve special characters where possible.

16. Preserve the original meaning.

17. Do NOT invent questions.

18. Do NOT invent options.

19. Do NOT invent an answer.

20. If the PDF contains an answer key,
    use the answer key.

21. If an answer is present as A/B/C/D,
    preserve it as A/B/C/D.

22. If an answer is present as 1/2/3/4,
    convert it:

    1 → A
    2 → B
    3 → C
    4 → D

23. If the PDF does NOT contain an answer,
    return:

    "correctAnswer": "",
    "ansNumber": ""

24. Every valid MCQ must contain exactly 4 options.

25. questionType must always be:

    "MCQ"

26. Do not add explanations.

27. Do not add comments.

28. Do not add markdown.

29. Return ONLY JSON.

========================================================
QUESTION FORMATS
========================================================

1. Question

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
CRITICAL ACCURACY RULE
========================================================

Do NOT use your general knowledge to silently change
a question or answer.

Only correct an extraction mistake when the source
PDF text supports the correction.

If the source is ambiguous, preserve the source data.

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

========================================================
SOURCE 1 — ORIGINAL PDF TEXT
========================================================

${pdfText}

========================================================
SOURCE 1 END
========================================================


========================================================
SOURCE 2 — REGEX PARSER RESULT
========================================================

${parserData}

========================================================
SOURCE 2 END
========================================================

Now compare both sources carefully.

Return ONLY the final JSON object.

`;

    // ========================================================
    // CALL GROQ
    // ========================================================

    const completion =
      await groq.chat.completions.create({

        model:
          "llama-3.3-70b-versatile",

        temperature: 0,

        response_format: {
          type: "json_object",
        },

        messages: [

          {
            role: "system",

            content:
              "You are an expert examination PDF parser and verifier. Return JSON only.",
          },

          {
            role: "user",

            content: prompt,
          },

        ],

      });

    // ========================================================
    // RESPONSE
    // ========================================================

    const content =
      completion
        .choices?.[0]
        ?.message
        ?.content;

    if (!content) {

      throw new Error(
        "Groq returned empty response"
      );
    }

    console.log(
      "🤖 Groq response received"
    );

    // ========================================================
    // PARSE JSON
    // ========================================================

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
        "❌ GROQ JSON PARSE ERROR:",
        error
      );

      console.error(
        "GROQ RAW RESPONSE:",
        content
      );

      throw new Error(
        "Groq returned invalid JSON"
      );
    }

    // ========================================================
    // CHECK QUESTIONS
    // ========================================================

    if (
      !parsed ||
      !Array.isArray(
        parsed.questions
      )
    ) {

      throw new Error(
        "Groq response does not contain questions array"
      );
    }

    // ========================================================
    // NORMALIZE
    // ========================================================

    const questions: GroqQuestion[] =
      parsed.questions
        .map(
          (
            item: any,
            index: number
          ) => {

            // ----------------------------------------------
            // OPTIONS
            // ----------------------------------------------

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

            // ----------------------------------------------
            // ANSWER
            // ----------------------------------------------

            const answer =
              normalizeAnswer(
                item.correctAnswer ||
                item.ansNumber ||
                ""
              );

            // ----------------------------------------------
            // QUESTION
            // ----------------------------------------------

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

    // ========================================================
    // REMOVE DUPLICATES
    // ========================================================

    const uniqueQuestions =
      questions.filter(
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
      "🤖 GROQ FINAL QUESTIONS:",
      uniqueQuestions.length
    );

    console.log(
      "=========================================="
    );

    return uniqueQuestions;
  };