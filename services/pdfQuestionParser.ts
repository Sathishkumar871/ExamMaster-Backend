
// ============================================================
// PDF QUESTION PARSER
// SUBJECT-WISE VERSION
// ============================================================

export interface ParsedQuestion {
  questionNumber: number;

  // Subject-wise question number
  subjectQuestionNumber: number;

  // Global question number if available
  globalQuestionNumber: number;

  subject: string;

  question: string;

  options: string[];

  correctAnswer: string;

  ansNumber: string;

  questionType: string;

  subjectOrder: number;
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
// NORMALIZE SUBJECT
// ============================================================

const normalizeSubject = (
  subject: string
): string => {
  const value = subject
    .trim()
    .toLowerCase()
    .replace(/[:\-]+$/g, "")
    .replace(/\s+/g, " ");

  // ----------------------------------------------------------
  // PHYSICS
  // ----------------------------------------------------------

  if (
    value === "physics" ||
    value === "phy" ||
    value === "phy." ||
    value === "phys"
  ) {
    return "Physics";
  }

  // ----------------------------------------------------------
  // CHEMISTRY
  // ----------------------------------------------------------

  if (
    value === "chemistry" ||
    value === "chem" ||
    value === "chem."
  ) {
    return "Chemistry";
  }

  // ----------------------------------------------------------
  // BOTANY
  // ----------------------------------------------------------

  if (
    value === "botany" ||
    value === "bot"
  ) {
    return "Botany";
  }

  // ----------------------------------------------------------
  // ZOOLOGY
  // ----------------------------------------------------------

  if (
    value === "zoology" ||
    value === "zoo"
  ) {
    return "Zoology";
  }

  // ----------------------------------------------------------
  // BIOLOGY
  // ----------------------------------------------------------

  if (
    value === "biology" ||
    value === "bio"
  ) {
    return "Biology";
  }

  return subject.trim();
};

// ============================================================
// SUBJECT HEADER DETECTOR
// ============================================================

const detectSubject = (
  line: string
): string | null => {

  const value = line
    .trim()
    .replace(/[:\-]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  // ----------------------------------------------------------
  // DIRECT SUBJECT NAMES
  // ----------------------------------------------------------

  if (
    value === "physics" ||
    value === "phy" ||
    value === "phy." ||
    value === "phys"
  ) {
    return "Physics";
  }

  if (
    value === "chemistry" ||
    value === "chem" ||
    value === "chem."
  ) {
    return "Chemistry";
  }

  if (
    value === "botany" ||
    value === "bot"
  ) {
    return "Botany";
  }

  if (
    value === "zoology" ||
    value === "zoo"
  ) {
    return "Zoology";
  }

  if (
    value === "biology" ||
    value === "bio"
  ) {
    return "Biology";
  }

  // ----------------------------------------------------------
  // COMMON PDF HEADERS
  // ----------------------------------------------------------

  if (
    value.includes("physics section") ||
    value === "section physics"
  ) {
    return "Physics";
  }

  if (
    value.includes("chemistry section") ||
    value === "section chemistry"
  ) {
    return "Chemistry";
  }

  if (
    value.includes("botany section") ||
    value === "section botany"
  ) {
    return "Botany";
  }

  if (
    value.includes("zoology section") ||
    value === "section zoology"
  ) {
    return "Zoology";
  }

  return null;
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

  if (
    value === "A" ||
    value === "1"
  ) {
    return {
      correctAnswer: "1",
      ansNumber: "1",
    };
  }

  if (
    value === "B" ||
    value === "2"
  ) {
    return {
      correctAnswer: "2",
      ansNumber: "2",
    };
  }

  if (
    value === "C" ||
    value === "3"
  ) {
    return {
      correctAnswer: "3",
      ansNumber: "3",
    };
  }

  if (
    value === "D" ||
    value === "4"
  ) {
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
// ============================================================

const getQuestionStart = (
  line: string
): {
  questionNumber: number;
  question: string;
} | null => {

  const cleanLine = line.trim();

  // ----------------------------------------------------------
  // DO NOT TREAT OPTIONS AS QUESTIONS
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
// PDF NOISE
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

  // Page 1
  if (
    /^page\s+\d+$/i.test(
      value
    )
  ) {
    return true;
  }

  // 1 / 10
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

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (
    !text ||
    typeof text !== "string"
  ) {

    console.log(
      "PDF PARSER: Empty text"
    );

    return [];
  }

  // ==========================================================
  // CLEAN
  // ==========================================================

  const normalized =
    cleanText(text);

  if (!normalized) {

    console.log(
      "PDF PARSER: No text after cleaning"
    );

    return [];
  }

  // ==========================================================
  // LINES
  // ==========================================================

  const lines =
    normalized
      .split("\n")
      .map(
        line =>
          line.trim()
      )
      .filter(
        line =>
          !isNoiseLine(line)
      );

  console.log(
    "PDF PARSER TOTAL LINES:",
    lines.length
  );

  // ==========================================================
  // CURRENT QUESTION
  // ==========================================================

  let currentQuestion:
    ParsedQuestion | null = null;

  // ==========================================================
  // CURRENT SUBJECT
  // ==========================================================

  let currentSubject = "";

  // ==========================================================
  // SUBJECT ORDER
  // ==========================================================

  let currentSubjectOrder = 0;

  // ==========================================================
  // SUBJECT QUESTION NUMBER
  // ==========================================================

  let currentSubjectQuestionNumber = 0;

  // ==========================================================
  // CURRENT OPTION
  // ==========================================================

  let currentOptionNumber = "";

  // ==========================================================
  // SAVE CURRENT QUESTION
  // ==========================================================

  const saveCurrentQuestion = () => {

    if (!currentQuestion) {
      return;
    }

    // --------------------------------------------------------
    // CLEAN QUESTION
    // --------------------------------------------------------

    currentQuestion.question =
      currentQuestion.question
        .replace(/\s+/g, " ")
        .trim();

    // --------------------------------------------------------
    // CLEAN OPTIONS
    // --------------------------------------------------------

    currentQuestion.options =
      currentQuestion.options
        .map(
          option =>
            option
              .replace(/\s+/g, " ")
              .trim()
        )
        .filter(Boolean);

    // --------------------------------------------------------
    // SUBJECT FALLBACK
    // --------------------------------------------------------

    if (
      !currentQuestion.subject
    ) {

      currentQuestion.subject =
        currentSubject ||
        "General";
    }

    // --------------------------------------------------------
    // VALID MCQ
    // --------------------------------------------------------

    if (
      currentQuestion.question &&
      currentQuestion.options.length === 4
    ) {

      const saved: ParsedQuestion = {

        questionNumber:
          currentQuestion.questionNumber,

        subjectQuestionNumber:
          currentQuestion.subjectQuestionNumber,

        globalQuestionNumber:
          currentQuestion.globalQuestionNumber,

        subject:
          currentQuestion.subject,

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

        subjectOrder:
          currentQuestion.subjectOrder,
      };

      questions.push(
        saved
      );

      console.log(
        "QUESTION SAVED:",
        saved.globalQuestionNumber,
        "| SUBJECT:",
        saved.subject,
        "| SUBJECT Q:",
        saved.subjectQuestionNumber,
        "| PDF Q:",
        saved.questionNumber
      );

    } else {

      console.log(
        "QUESTION SKIPPED:",
        currentQuestion.questionNumber,
        "| SUBJECT:",
        currentQuestion.subject,
        "| OPTIONS:",
        currentQuestion.options.length
      );
    }

    currentQuestion = null;

    currentOptionNumber = "";
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
    // SUBJECT HEADER
    // ========================================================

    const detectedSubject =
      detectSubject(line);

    if (detectedSubject) {

      // Save previous question
      saveCurrentQuestion();

      currentSubject =
        normalizeSubject(
          detectedSubject
        );

      currentSubjectOrder++;

      // Reset subject question counter
      currentSubjectQuestionNumber = 0;

      console.log(
        "=========================================="
      );

      console.log(
        "📚 SUBJECT DETECTED:",
        currentSubject
      );

      console.log(
        "📚 SUBJECT ORDER:",
        currentSubjectOrder
      );

      console.log(
        "=========================================="
      );

      continue;
    }

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

      // ------------------------------------------------------
      // Increment subject question number
      // ------------------------------------------------------

      currentSubjectQuestionNumber++;

      // ------------------------------------------------------
      // Create question
      // ------------------------------------------------------

      currentQuestion = {

        questionNumber:
          questionStart.questionNumber,

        subjectQuestionNumber:
          currentSubjectQuestionNumber,

        globalQuestionNumber:
          questions.length + 1,

        subject:
          currentSubject ||
          "General",

        question:
          questionStart.question,

        options: [],

        correctAnswer: "",

        ansNumber: "",

        questionType:
          "MCQ",

        subjectOrder:
          currentSubjectOrder || 1,
      };

      currentOptionNumber = "";

      console.log(
        "QUESTION DETECTED:",
        questionStart.questionNumber,
        "| SUBJECT:",
        currentSubject ||
          "General"
      );

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
    // IGNORE EXTRA TEXT AFTER FOUR OPTIONS
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
  //
  // IMPORTANT:
  //
  // DO NOT use only questionNumber.
  //
  // Physics Q1
  // Chemistry Q1
  //
  // can both exist.
  //
  // Therefore:
  //
  // subject + questionNumber
  //
  // ==========================================================

  const uniqueMap =
    new Map<
      string,
      ParsedQuestion
    >();

  for (
    const question of questions
  ) {

    const key =
      `${question.subject}__${question.questionNumber}`;

    if (
      !uniqueMap.has(key)
    ) {

      uniqueMap.set(
        key,
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
      (a, b) => {

        // First subject order
        if (
          a.subjectOrder !==
          b.subjectOrder
        ) {

          return (
            a.subjectOrder -
            b.subjectOrder
          );
        }

        // Then question number
        return (
          a.questionNumber -
          b.questionNumber
        );
      }
    );

  // ==========================================================
  // RE-CALCULATE GLOBAL NUMBER
  // ==========================================================

  uniqueQuestions.forEach(
    (
      question,
      index
    ) => {

      question.globalQuestionNumber =
        index + 1;
    }
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
    "================================================"
  );

  console.log(
    "SUBJECT SUMMARY:"
  );

  const subjectSummary =
    new Map<
      string,
      number
    >();

  for (
    const question of uniqueQuestions
  ) {

    subjectSummary.set(
      question.subject,
      (
        subjectSummary.get(
          question.subject
        ) || 0
      ) + 1
    );
  }

  subjectSummary.forEach(
    (
      count,
      subject
    ) => {

      console.log(
        `📚 ${subject}: ${count} questions`
      );
    }
  );

  console.log(
    "================================================"
  );

  console.log(
    "QUESTION DETAILS:"
  );

  uniqueQuestions.forEach(
    question => {

      console.log(
        `Q${question.globalQuestionNumber} | ${question.subject} | Subject Q${question.subjectQuestionNumber} | PDF Q${question.questionNumber}`
      );
    }
  );

  console.log(
    "================================================"
  );

  return uniqueQuestions;
}

