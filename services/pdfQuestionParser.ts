export interface ParsedQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;
}

// ============================================================
// CLEAN PDF TEXT
// ============================================================

const cleanText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
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
  const value = answer
    .trim()
    .toUpperCase()
    .replace(/[().]/g, "");

  if (value === "A" || value === "1") {
    return {
      correctAnswer: "1",
      ansNumber: "1",
    };
  }

  if (value === "B" || value === "2") {
    return {
      correctAnswer: "2",
      ansNumber: "2",
    };
  }

  if (value === "C" || value === "3") {
    return {
      correctAnswer: "3",
      ansNumber: "3",
    };
  }

  if (value === "D" || value === "4") {
    return {
      correctAnswer: "4",
      ansNumber: "4",
    };
  }

  return {
    correctAnswer: value,
    ansNumber: "",
  };
};

// ============================================================
// OPTION DETECTOR
//
// Supports:
//
// (1) Option
// (2) Option
// (3) Option
// (4) Option
//
// 1) Option
// 2) Option
//
// 1. Option
// 2. Option
//
// (A) Option
// (B) Option
//
// A) Option
// B) Option
//
// A. Option
// B. Option
// ============================================================

const getOption = (
  line: string
): {
  number: string;
  text: string;
} | null => {
  const cleanLine = line.trim();

  const match = cleanLine.match(
    /^(?:\(\s*([1-4A-D])\s*\)|([1-4A-D])[.)])\s+(.+)$/i
  );

  if (!match) {
    return null;
  }

  const rawNumber = (
    match[1] ||
    match[2] ||
    ""
  )
    .trim()
    .toUpperCase();

  const optionText = (
    match[3] ||
    ""
  ).trim();

  if (
    !rawNumber ||
    !optionText
  ) {
    return null;
  }

  let number = rawNumber;

  if (number === "A") number = "1";
  if (number === "B") number = "2";
  if (number === "C") number = "3";
  if (number === "D") number = "4";

  return {
    number,
    text: optionText,
  };
};

// ============================================================
// ANSWER DETECTOR
//
// Supports:
//
// Answer: 1
// Answer: A
// Ans: 2
// Ans: B
// Correct Answer: C
// Correct: 4
// Answer - A
// ============================================================

const getAnswer = (
  line: string
): {
  correctAnswer: string;
  ansNumber: string;
} | null => {
  const cleanLine = line.trim();

  const match = cleanLine.match(
    /^(?:answer|ans|correct\s+answer|correct)\s*[:\-]?\s*\(?([1-4A-D])\)?(?:\.|\)|\s|$)/i
  );

  if (!match) {
    return null;
  }

  return normalizeAnswer(
    match[1]
  );
};

// ============================================================
// QUESTION NUMBER DETECTOR
//
// Supports:
//
// 1. Question
// 1) Question
// 1 Question
//
// Q1. Question
// Q1) Question
// Q.1 Question
//
// Question 1. Question
// ============================================================

const getQuestionStart = (
  line: string
): {
  questionNumber: number;
  question: string;
} | null => {
  const cleanLine = line.trim();

  // ----------------------------------------------------------
  // IMPORTANT:
  // Do NOT treat (1), (2), (3), (4) as question numbers.
  // Those are options.
  // ----------------------------------------------------------

  if (
    /^\([1-4A-D]\)/i.test(
      cleanLine
    )
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // 1. Question
  // 1) Question
  // ----------------------------------------------------------

  let match = cleanLine.match(
    /^(\d+)[.)]\s+(.+)$/
  );

  if (match) {
    return {
      questionNumber:
        Number(match[1]),
      question:
        match[2].trim(),
    };
  }

  // ----------------------------------------------------------
  // Q1. Question
  // Q1) Question
  // Q.1 Question
  // ----------------------------------------------------------

  match = cleanLine.match(
    /^Q\.?\s*(\d+)\s*[:.)-]?\s*(.+)$/i
  );

  if (match) {
    return {
      questionNumber:
        Number(match[1]),
      question:
        match[2].trim(),
    };
  }

  // ----------------------------------------------------------
  // Question 1. Question
  // ----------------------------------------------------------

  match = cleanLine.match(
    /^Question\s+(\d+)\s*[:.)-]?\s*(.+)$/i
  );

  if (match) {
    return {
      questionNumber:
        Number(match[1]),
      question:
        match[2].trim(),
    };
  }

  return null;
};

// ============================================================
// CHECK OPTION
// ============================================================

const isOptionLine = (
  line: string
): boolean => {
  return getOption(line) !== null;
};

// ============================================================
// CHECK ANSWER
// ============================================================

const isAnswerLine = (
  line: string
): boolean => {
  return getAnswer(line) !== null;
};

// ============================================================
// REMOVE COMMON PDF NOISE
// ============================================================

const isNoiseLine = (
  line: string
): boolean => {
  const value = line
    .trim()
    .toLowerCase();

  if (!value) {
    return true;
  }

  // Page number
  if (
    /^page\s+\d+$/i.test(
      value
    )
  ) {
    return true;
  }

  if (
    /^\d+\s*\/\s*\d+$/.test(
      value
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// MAIN PARSER
// ============================================================

export function parseQuestions(
  text: string
): ParsedQuestion[] {

  const questions: ParsedQuestion[] = [];

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    !text ||
    typeof text !== "string"
  ) {
    console.log(
      "PDF PARSER: Empty text"
    );

    return [];
  }

  // ----------------------------------------------------------
  // CLEAN
  // ----------------------------------------------------------

  const normalized =
    cleanText(text);

  if (!normalized) {
    console.log(
      "PDF PARSER: No text after cleaning"
    );

    return [];
  }

  // ----------------------------------------------------------
  // LINES
  // ----------------------------------------------------------

  const lines =
    normalized
      .split("\n")
      .map(
        (line) =>
          line.trim()
      )
      .filter(
        (line) =>
          !isNoiseLine(line)
      );

  console.log(
    "PDF PARSER TOTAL LINES:",
    lines.length
  );

  // ----------------------------------------------------------
  // CURRENT QUESTION
  // ----------------------------------------------------------

  let currentQuestion:
    ParsedQuestion | null = null;

  // ----------------------------------------------------------
  // CURRENT OPTION NUMBER
  // ----------------------------------------------------------

  let currentOptionNumber =
    "";

  // ==========================================================
  // SAVE CURRENT QUESTION
  // ==========================================================

  const saveCurrentQuestion =
    () => {

      if (!currentQuestion) {
        return;
      }

      // --------------------------------------------
      // CLEAN QUESTION
      // --------------------------------------------

      currentQuestion.question =
        currentQuestion.question
          .replace(/\s+/g, " ")
          .trim();

      // --------------------------------------------
      // CLEAN OPTIONS
      // --------------------------------------------

      currentQuestion.options =
        currentQuestion.options
          .map(
            (option) =>
              option
                .replace(/\s+/g, " ")
                .trim()
          )
          .filter(Boolean);

      // --------------------------------------------
      // ONLY SAVE VALID MCQ
      // --------------------------------------------

      if (
        currentQuestion.question &&
        currentQuestion.options.length >= 4
      ) {

        const saved: ParsedQuestion = {
          questionNumber:
            currentQuestion.questionNumber,

          question:
            currentQuestion.question,

          options:
            currentQuestion.options.slice(
              0,
              4
            ),

          correctAnswer:
            currentQuestion.correctAnswer,

          ansNumber:
            currentQuestion.ansNumber,

          questionType:
            "MCQ",
        };

        questions.push(
          saved
        );

        console.log(
          "QUESTION SAVED:",
          saved.questionNumber
        );

      } else {

        console.log(
          "QUESTION SKIPPED:",
          currentQuestion.questionNumber,
          "OPTIONS:",
          currentQuestion.options.length,
          "QUESTION:",
          currentQuestion.question.substring(
            0,
            100
          )
        );
      }

      currentQuestion =
        null;

      currentOptionNumber =
        "";
    };

  // ==========================================================
  // PROCESS LINES
  // ==========================================================

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const line =
      lines[i];

    // ========================================================
    // QUESTION START
    // ========================================================

    const questionStart =
      getQuestionStart(
        line
      );

    if (questionStart) {

      // Save previous
      saveCurrentQuestion();

      // Create new
      currentQuestion = {

        questionNumber:
          questionStart.questionNumber,

        question:
          questionStart.question,

        options: [],

        correctAnswer:
          "",

        ansNumber:
          "",

        questionType:
          "MCQ",
      };

      currentOptionNumber =
        "";

      continue;
    }

    // ========================================================
    // BEFORE FIRST QUESTION
    // ========================================================

    if (!currentQuestion) {
      continue;
    }

    // ========================================================
    // ANSWER
    // ========================================================

    const answer =
      getAnswer(
        line
      );

    if (answer) {

      currentQuestion.correctAnswer =
        answer.correctAnswer;

      currentQuestion.ansNumber =
        answer.ansNumber;

      continue;
    }

    // ========================================================
    // OPTION
    // ========================================================

    const option =
      getOption(
        line
      );

    if (option) {

      // ------------------------------------------------------
      // Add option
      // ------------------------------------------------------

      if (
        currentQuestion.options.length <
        4
      ) {

        currentQuestion.options.push(
          option.text
        );

        currentOptionNumber =
          option.number;

      }

      continue;
    }

    // ========================================================
    // EXTRA QUESTION TEXT
    //
    // If options did not start,
    // line belongs to question.
    // ========================================================

    if (
      currentQuestion.options.length ===
      0
    ) {

      currentQuestion.question +=
        " " + line;

      continue;
    }

    // ========================================================
    // MULTI-LINE OPTION
    // ========================================================

    if (
      currentQuestion.options.length >
        0 &&
      currentQuestion.options.length <
        4 &&
      !isOptionLine(line) &&
      !isAnswerLine(line)
    ) {

      const lastIndex =
        currentQuestion.options.length -
        1;

      if (
        lastIndex >= 0
      ) {

        currentQuestion.options[
          lastIndex
        ] +=
          " " + line;
      }

      continue;
    }

    // ========================================================
    // IGNORE EXTRA TEXT AFTER 4 OPTIONS
    // ========================================================

    if (
      currentQuestion.options.length >=
      4
    ) {
      continue;
    }
  }

  // ==========================================================
  // SAVE LAST QUESTION
  // ==========================================================

  saveCurrentQuestion();

  // ==========================================================
  // REMOVE DUPLICATES
  // ==========================================================

  const uniqueMap =
    new Map<
      number,
      ParsedQuestion
    >();

  for (
    const question of questions
  ) {

    if (
      !uniqueMap.has(
        question.questionNumber
      )
    ) {

      uniqueMap.set(
        question.questionNumber,
        question
      );
    }
  }

  // ==========================================================
  // SORT
  // ==========================================================

  const uniqueQuestions =
    Array.from(
      uniqueMap.values()
    ).sort(
      (a, b) =>
        a.questionNumber -
        b.questionNumber
    );

  // ==========================================================
  // FINAL LOG
  // ==========================================================

  console.log(
    "================================================"
  );

  console.log(
    "TOTAL PARSED QUESTIONS:",
    uniqueQuestions.length
  );

  console.log(
    "QUESTION NUMBERS:",
    uniqueQuestions.map(
      (q) =>
        q.questionNumber
    )
  );

  console.log(
    "================================================"
  );

  return uniqueQuestions;
}