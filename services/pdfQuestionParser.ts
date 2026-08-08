
export interface ParsedQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  ansNumber: string;
  questionType: string;
}

// ======================================================
// CLEAN TEXT
// ======================================================
const cleanText = (text: string): string => {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[ ]+/g, " ")
    .trim();
};

// ======================================================
// NORMALIZE ANSWER
// ======================================================
const normalizeAnswer = (
  answer: string
): {
  correctAnswer: string;
  ansNumber: string;
} => {
  const value = answer.trim().toUpperCase();

  if (value === "A" || value === "1") {
    return {
      correctAnswer: value,
      ansNumber: "1",
    };
  }

  if (value === "B" || value === "2") {
    return {
      correctAnswer: value,
      ansNumber: "2",
    };
  }

  if (value === "C" || value === "3") {
    return {
      correctAnswer: value,
      ansNumber: "3",
    };
  }

  if (value === "D" || value === "4") {
    return {
      correctAnswer: value,
      ansNumber: "4",
    };
  }

  return {
    correctAnswer: value,
    ansNumber: "",
  };
};

// ======================================================
// OPTION DETECTOR
//
// Supports:
// (1) Option
// (2) Option
// 1) Option
// 2) Option
// 1. Option
// 2. Option
// (A) Option
// (B) Option
// A) Option
// B) Option
// A. Option
// B. Option
// ======================================================
const getOption = (
  line: string
): {
  number: string;
  text: string;
} | null => {
  const cleanLine = line.trim();

  const match = cleanLine.match(
    /^(?:\(([1-4A-D])\)|([1-4A-D])[.)])\s+(.+)$/i
  );

  if (!match) {
    return null;
  }

  // IMPORTANT:
  // match[1] OR match[2] lo whichever available adi use chestham
  const rawNumber = (match[1] || match[2] || "").toUpperCase();

  // Text always match[3]
  const optionText = (match[3] || "").trim();

  if (!rawNumber || !optionText) {
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

// ======================================================
// ANSWER DETECTOR
//
// Supports:
// Answer: 1
// Answer: A
// Ans: 2
// Ans: B
// Correct Answer: C
// Correct: 4
// Answer - A
// ======================================================
const getAnswer = (
  line: string
): {
  correctAnswer: string;
  ansNumber: string;
} | null => {
  const cleanLine = line.trim();

  const match = cleanLine.match(
    /^(?:answer|ans|correct\s+answer|correct)\s*[:\-]?\s*([1-4A-D])\b/i
  );

  if (!match) {
    return null;
  }

  const answerValue = match[1];

  return normalizeAnswer(answerValue);
};

// ======================================================
// QUESTION NUMBER DETECTOR
//
// Supports:
// 1. Question
// 1) Question
// 1 Question
// Q1. Question
// Q1) Question
// Q.1 Question
// Question 1. Question
// ======================================================
const getQuestionStart = (
  line: string
): {
  questionNumber: number;
  question: string;
} | null => {
  const cleanLine = line.trim();

  // --------------------------------------------------
  // 1. Question
  // 1) Question
  // 1 Question
  // --------------------------------------------------
  let match = cleanLine.match(
    /^(\d+)[.)]\s*(.+)$/ 
  );

  if (match) {
    return {
      questionNumber: Number(match[1]),
      question: match[2].trim(),
    };
  }

  // --------------------------------------------------
  // Q1. Question
  // Q1) Question
  // Q.1 Question
  // --------------------------------------------------
  match = cleanLine.match(
    /^Q\.?\s*(\d+)\s*[:.)-]?\s*(.+)$/i
  );

  if (match) {
    return {
      questionNumber: Number(match[1]),
      question: match[2].trim(),
    };
  }

  // --------------------------------------------------
  // Question 1. Question
  // --------------------------------------------------
  match = cleanLine.match(
    /^Question\s+(\d+)\s*[:.)-]?\s*(.+)$/i
  );

  if (match) {
    return {
      questionNumber: Number(match[1]),
      question: match[2].trim(),
    };
  }

  return null;
};

// ======================================================
// CHECK WHETHER LINE LOOKS LIKE OPTION
// ======================================================
const isOptionLine = (line: string): boolean => {
  return getOption(line) !== null;
};

// ======================================================
// CHECK WHETHER LINE LOOKS LIKE ANSWER
// ======================================================
const isAnswerLine = (line: string): boolean => {
  return getAnswer(line) !== null;
};

// ======================================================
// MAIN PARSER
// ======================================================
export function parseQuestions(
  text: string
): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // --------------------------------------------------
  // Validate text
  // --------------------------------------------------
  if (!text || typeof text !== "string") {
    console.log("PDF PARSER: Empty text");
    return [];
  }

  // --------------------------------------------------
  // Clean text
  // --------------------------------------------------
  const normalized = cleanText(text);

  if (!normalized) {
    console.log("PDF PARSER: No text after cleaning");
    return [];
  }

  // --------------------------------------------------
  // Split into lines
  // --------------------------------------------------
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(
    "PDF PARSER TOTAL LINES:",
    lines.length
  );

  // --------------------------------------------------
  // Current question
  // --------------------------------------------------
  let currentQuestion: ParsedQuestion | null = null;

  // ==================================================
  // SAVE CURRENT QUESTION
  // ==================================================
  const saveCurrentQuestion = () => {
    if (!currentQuestion) {
      return;
    }

    // Remove empty options
    currentQuestion.options =
      currentQuestion.options
        .map((option) => option.trim())
        .filter(Boolean);

    // Only save questions having exactly 4 options
    if (
      currentQuestion.question.trim() &&
      currentQuestion.options.length === 4
    ) {
      questions.push({
        questionNumber:
          currentQuestion.questionNumber,

        question:
          currentQuestion.question.trim(),

        options:
          currentQuestion.options.slice(0, 4),

        correctAnswer:
          currentQuestion.correctAnswer,

        ansNumber:
          currentQuestion.ansNumber,

        questionType:
          "MCQ",
      });
    } else {
      console.log(
        "QUESTION SKIPPED:",
        currentQuestion.questionNumber,
        "OPTIONS:",
        currentQuestion.options.length
      );
    }

    currentQuestion = null;
  };

  // ==================================================
  // PROCESS EVERY LINE
  // ==================================================
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ================================================
    // QUESTION START
    // ================================================
    const questionStart =
      getQuestionStart(line);

    if (questionStart) {
      // Save previous question
      saveCurrentQuestion();

      // Create new question
      currentQuestion = {
        questionNumber:
          questionStart.questionNumber,

        question:
          questionStart.question,

        options: [],

        correctAnswer: "",

        ansNumber: "",

        questionType: "MCQ",
      };

      continue;
    }

    // ================================================
    // Ignore everything before first question
    // ================================================
    if (!currentQuestion) {
      continue;
    }

    // ================================================
    // OPTION
    // ================================================
    const option =
      getOption(line);

    if (option) {
      // Avoid more than 4 options
      if (
        currentQuestion.options.length < 4
      ) {
        currentQuestion.options.push(
          option.text
        );
      }

      continue;
    }

    // ================================================
    // ANSWER
    // ================================================
    const answer =
      getAnswer(line);

    if (answer) {
      currentQuestion.correctAnswer =
        answer.correctAnswer;

      currentQuestion.ansNumber =
        answer.ansNumber;

      continue;
    }

    // ================================================
    // EXTRA QUESTION TEXT
    //
    // If options haven't started yet,
    // this is part of question.
    // ================================================
    if (
      currentQuestion.options.length === 0
    ) {
      currentQuestion.question +=
        " " + line;

      continue;
    }

    // ================================================
    // MULTI-LINE OPTION
    //
    // Example:
    // (1) This is a very long option
    //     which continues here
    // ================================================
    if (
      currentQuestion.options.length > 0 &&
      currentQuestion.options.length < 4 &&
      !isOptionLine(line) &&
      !isAnswerLine(line)
    ) {
      const lastIndex =
        currentQuestion.options.length - 1;

      if (lastIndex >= 0) {
        currentQuestion.options[lastIndex] +=
          " " + line;
      }

      continue;
    }
  }

  // ==================================================
  // SAVE LAST QUESTION
  // ==================================================
  saveCurrentQuestion();

  // ==================================================
  // REMOVE DUPLICATE QUESTION NUMBERS
  // ==================================================
  const uniqueQuestions =
    questions.filter(
      (question, index, array) =>
        index ===
        array.findIndex(
          (q) =>
            q.questionNumber ===
            question.questionNumber
        )
    );

  // ==================================================
  // SORT BY QUESTION NUMBER
  // ==================================================
  uniqueQuestions.sort(
    (a, b) =>
      a.questionNumber -
      b.questionNumber
  );

  // ==================================================
  // FINAL LOG
  // ==================================================
  console.log(
    "TOTAL PARSED QUESTIONS:",
    uniqueQuestions.length
  );

  return uniqueQuestions;
}
