// services/pdfQuestionParser.ts

// ============================================================
// EXAMMASTER - SMART PDF QUESTION PARSER
// ============================================================
// Supports:
// 1. MCQ
// 2. TABLE
// 3. DIAGRAM / FIGURE
// 4. Chapter detection
// 5. Continuous global numbering
// 6. Chapter-wise PDF numbering
// 7. Answer-key skipping
// 8. Header/footer/page-number filtering
// 9. Duplicate question removal
// 10. A/B/C/D and 1/2/3/4 options
//
// IMPORTANT:
// This parser works on extracted PDF text.
// Embedded PDF images require a separate image extraction step.
// ============================================================

export type QuestionType = "MCQ" | "TABLE" | "DIAGRAM";

export type AIStatus =
  | "pending"
  | "correct"
  | "wrong"
  | "not_checked";

export interface ParsedQuestion {
  questionNumber: number; // Original/local PDF number
  subjectQuestionNumber: number; // Continuous subject number
  globalQuestionNumber: number; // Continuous complete PDF number

  question: string;
  options: string[];

  correctAnswer: string;
  ansNumber: string;

  questionType: QuestionType;

  tableHeaders: string[];
  tableRows: string[][];

  imageUrl: string;
  questionImage: string;

  subject: string;
  chapter: string;

  subjectOrder: number;

  aiGenerated: boolean;
  aiVerified: boolean;
  aiStatus: AIStatus;
  aiIssues: string[];
  aiExplanation: string;
}

// ============================================================
// INTERNAL TYPES
// ============================================================

interface QuestionBlock {
  number: number;
  block: string;
  chapter: string;
  section: string;
  position: number;
}

// ============================================================
// CHAPTER STATE
// ============================================================

interface ChapterState {
  title: string;
  index: number;
  localQuestionNumber: number;
}

// ============================================================
// TEXT CLEANING
// ============================================================

const cleanText = (value: string): string => {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeLine = (value: string): string => {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// NORMALIZE WHOLE PDF
// ============================================================

const normalizePdfText = (value: string): string => {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ============================================================
// REMOVE QUESTION NUMBER
// ============================================================

const removeQuestionNumber = (value: string): string => {
  return String(value || "")
    .replace(
      /^\s*(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.)\-:]\s*/i,
      ""
    )
    .trim();
};

// ============================================================
// ANSWER KEY DETECTION
// ============================================================

const ANSWER_KEY_PATTERNS = [
  /^answers?\s*(?:key)?$/i,
  /^answer\s+key$/i,
  /^answers\s+and\s+solutions$/i,
  /^solutions$/i,
  /^answer\s+sheet$/i,
  /^correct\s+answers$/i,
  /^answer\s*key/i,
  /^ans\s*key/i,
];

const isAnswerKeyHeading = (line: string): boolean => {
  const value = normalizeLine(line);

  if (!value) {
    return false;
  }

  return ANSWER_KEY_PATTERNS.some((pattern) =>
    pattern.test(value)
  );
};

const isAnswerKeyContentLine = (line: string): boolean => {
  const value = normalizeLine(line);

  if (!value) {
    return false;
  }

  if (
    /\b(?:answer|ans)\b\s*[:.-]?\s*[A-D1-4]\b/i.test(value)
  ) {
    return true;
  }

  // Typical answer-key sequence:
  // 1-A 2-C 3-B ...
  if (
    /^\s*\d{1,3}\s*[-.)]\s*[A-D1-4]\b/i.test(value)
  ) {
    return true;
  }

  // Typical compact answer key:
  // 1 2 3 4 1 3 2 ...
  if (
    /^\s*(?:[1-4]\s*){8,}$/.test(value)
  ) {
    return true;
  }

  return false;
};

// ============================================================
// SECTION DETECTION
// ============================================================

const SECTION_PATTERNS = [
  /^class\s+(?:xi|11)\b/i,
  /^class\s+(?:xii|12)\b/i,
  /^section\s+[a-z0-9]+/i,
];

const detectSection = (
  lines: string[],
  index: number
): string => {
  const current = normalizeLine(lines[index]);

  if (!current) {
    return "";
  }

  if (/^class\s+(?:xi|11)\b/i.test(current)) {
    return "Class XI";
  }

  if (/^class\s+(?:xii|12)\b/i.test(current)) {
    return "Class XII";
  }

  if (/^section\s+/i.test(current)) {
    return current;
  }

  return "";
};

// ============================================================
// CHAPTER DETECTION
// ============================================================

const CHAPTER_KEYWORDS = [
  "chapter",
  "unit",
  "lesson",
  "part",
];

const isLikelyChapterHeading = (
  line: string,
  previousLine = "",
  nextLine = ""
): boolean => {
  const value = normalizeLine(line);

  if (!value) {
    return false;
  }

  // Explicit chapter heading
  if (
    /^(?:chapter|unit|lesson|part)\s*(?:[-:.)]?\s*)?\d+/i.test(
      value
    )
  ) {
    return true;
  }

  if (
    /^(?:chapter|unit|lesson|part)\b/i.test(value)
  ) {
    return true;
  }

  // Common NCERT-style heading:
  // 1 The Living World
  // 2 Biological Classification
  if (
    /^\d{1,2}\s+[A-Za-z][A-Za-z0-9 ,:&'()\-]{3,100}$/.test(
      value
    )
  ) {
    return true;
  }

  // All-uppercase meaningful heading
  const letters = value.replace(/[^A-Za-z]/g, "");

  if (
    letters.length >= 5 &&
    value.length <= 120 &&
    value === value.toUpperCase() &&
    !/\d{1,3}[.)\-:]/.test(value) &&
    !/^(?:PAGE|CONTENTS|INDEX|ANSWERS?|SOLUTIONS?)\b/i.test(
      value
    )
  ) {
    return true;
  }

  // Heading followed by a question section
  if (
    nextLine &&
    /^(?:questions?|exercise|mcq|multiple\s+choice)/i.test(
      normalizeLine(nextLine)
    )
  ) {
    return true;
  }

  // Avoid unused variable warning while keeping contextual API
  void previousLine;

  return false;
};

// ============================================================
// CLEAN CHAPTER TITLE
// ============================================================

const cleanChapterTitle = (value: string): string => {
  let title = normalizeLine(value);

  title = title.replace(
    /^(?:chapter|unit|lesson|part)\s*(?:[-:.)]?\s*)?\d*\s*/i,
    ""
  );

  title = title.replace(
    /^\d{1,2}\s*[.)\-:]\s*/,
    ""
  );

  return title.trim();
};

// ============================================================
// QUESTION START DETECTION
// ============================================================

/*
 Supports:

 1. Question
 2) Question
 3: Question
 Q4. Question
 Question 5. Question

 IMPORTANT:
 This is intentionally line-based.
*/

const QUESTION_START_REGEX =
  /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.)\-:]\s+(\S.*)$/i;

const isQuestionStartLine = (
  line: string
): boolean => {
  return QUESTION_START_REGEX.test(
    normalizeLine(line)
  );
};

const getQuestionNumberFromLine = (
  line: string
): number | null => {
  const match = normalizeLine(line).match(
    QUESTION_START_REGEX
  );

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (!Number.isInteger(number)) {
    return null;
  }

  if (number < 1 || number > 200) {
    return null;
  }

  return number;
};

// ============================================================
// OPTION DETECTION
// ============================================================

const OPTION_START_REGEX =
  /^\s*(?:\(([A-D])\)|([A-D])[.)\-:]|\(([1-4])\)|([1-4])[.)\-:])\s+(.*)$/i;

const isOptionLine = (line: string): boolean => {
  return OPTION_START_REGEX.test(
    normalizeLine(line)
  );
};

// ============================================================
// OPTION LABEL
// ============================================================

const getOptionLabel = (
  line: string
): string => {
  const match = normalizeLine(line).match(
    OPTION_START_REGEX
  );

  if (!match) {
    return "";
  }

  return (
    match[1] ||
    match[2] ||
    match[3] ||
    match[4] ||
    ""
  ).toUpperCase();
};

// ============================================================
// OPTION TEXT
// ============================================================

const getOptionText = (
  line: string
): string => {
  const match = normalizeLine(line).match(
    OPTION_START_REGEX
  );

  if (!match) {
    return "";
  }

  return String(match[5] || "").trim();
};

// ============================================================
// DIAGRAM KEYWORDS
// ============================================================

const DIAGRAM_KEYWORDS = [
  "following diagram",
  "given diagram",
  "given figure",
  "following figure",
  "figure below",
  "figure given below",
  "diagram below",
  "diagram given below",
  "shown in the figure",
  "shown below",
  "shown in figure",
  "refer to the figure",
  "refer the figure",
  "refer to diagram",
  "refer the diagram",
  "observe the diagram",
  "observe the figure",
  "observe following figure",
  "according to the diagram",
  "according to the figure",
  "according to following figure",
  "image shows",
  "image given",
  "figure shows",
  "diagram shows",
  "figure represents",
  "diagram represents",
  "look at the figure",
  "look at the diagram",
  "study the figure",
  "study the diagram",
  "based on the figure",
  "based on the diagram",
  "as shown in figure",
  "as shown in the figure",
  "as shown below",
  "schematic diagram",
  "schematic representation",
  "figure",
  "diagram",
];

// ============================================================
// DETECT DIAGRAM
// ============================================================

const detectDiagram = (
  text: string
): boolean => {
  const lower = String(text || "").toLowerCase();

  return DIAGRAM_KEYWORDS.some(
    (keyword) =>
      lower.includes(keyword)
  );
};

// ============================================================
// FIGURE REFERENCE
// ============================================================

const detectFigureReference = (
  text: string
): boolean => {
  const lower = String(text || "").toLowerCase();

  const patterns = [
    /\bfig\.?\s*\d+/i,
    /\bfigure\s+\d+/i,
    /\bdiagram\s+\d+/i,
    /\bimage\s+\d+/i,
  ];

  return patterns.some((pattern) =>
    pattern.test(lower)
  );
};

// ============================================================
// TABLE LINE DETECTION
// ============================================================

const looksLikeTableLine = (
  line: string
): boolean => {
  const original = String(line || "");
  const value = normalizeLine(original);

  if (!value) {
    return false;
  }

  if (value.includes("|")) {
    return true;
  }

  if (original.includes("\t")) {
    return true;
  }

  if (/\S+\s{3,}\S+/.test(original)) {
    return true;
  }

  return false;
};

// ============================================================
// SPLIT TABLE ROW
// ============================================================

const splitTableRow = (
  line: string
): string[] => {
  const value = String(line || "").trim();

  if (value.includes("|")) {
    return value
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  if (value.includes("\t")) {
    return value
      .split("\t")
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  return value
    .split(/\s{3,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
};

// ============================================================
// TABLE SEPARATOR
// ============================================================

const isTableSeparator = (
  row: string[]
): boolean => {
  if (!row.length) {
    return false;
  }

  return row.every((cell) =>
    /^[-:]+$/.test(cell.trim())
  );
};

// ============================================================
// PARSE TABLE
// ============================================================

const parseTable = (
  text: string
): {
  headers: string[];
  rows: string[][];
} => {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tableLines = lines.filter(
    looksLikeTableLine
  );

  if (tableLines.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  const parsedRows = tableLines
    .map(splitTableRow)
    .filter((row) => row.length >= 2);

  if (parsedRows.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  const filteredRows =
    parsedRows.filter(
      (row) => !isTableSeparator(row)
    );

  if (filteredRows.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  return {
    headers: filteredRows[0],
    rows: filteredRows.slice(1),
  };
};

// ============================================================
// EXTRACT OPTIONS
// ============================================================

const extractOptions = (
  text: string
): {
  question: string;
  options: string[];
} => {
  const lines = String(text || "")
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const optionIndexes: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isOptionLine(lines[i])) {
      optionIndexes.push(i);
    }
  }

  if (!optionIndexes.length) {
    return {
      question: removeQuestionNumber(
        lines.join(" ")
      ),
      options: [],
    };
  }

  const firstOptionIndex =
    optionIndexes[0];

  const questionLines =
    lines.slice(0, firstOptionIndex);

  const options: string[] = [];

  for (
    let i = 0;
    i < optionIndexes.length;
    i++
  ) {
    const startIndex =
      optionIndexes[i];

    const endIndex =
      i + 1 < optionIndexes.length
        ? optionIndexes[i + 1]
        : lines.length;

    const firstLine =
      getOptionText(lines[startIndex]);

    const continuationLines =
      lines.slice(
        startIndex + 1,
        endIndex
      );

    const optionText = [
      firstLine,
      ...continuationLines,
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (optionText) {
      options.push(optionText);
    }
  }

  return {
    question:
      removeQuestionNumber(
        questionLines.join(" ")
      ),
    options: options.slice(0, 4),
  };
};

// ============================================================
// EXTRACT ANSWER
// ============================================================

const extractAnswer = (
  text: string
): {
  correctAnswer: string;
  ansNumber: string;
} => {
  const patterns = [
    /\b(?:correct\s+answer|correct\s+option|answer|ans)\s*[:.\-]?\s*\(?\s*([A-D1-4])\s*\)?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const answer =
      match[1].trim().toUpperCase();

    if (
      ["A", "B", "C", "D"].includes(
        answer
      )
    ) {
      return {
        correctAnswer: answer,
        ansNumber: String(
          answer.charCodeAt(0) - 64
        ),
      };
    }

    if (
      ["1", "2", "3", "4"].includes(
        answer
      )
    ) {
      const letters: Record<
        string,
        string
      > = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
      };

      return {
        correctAnswer:
          letters[answer],
        ansNumber: answer,
      };
    }
  }

  return {
    correctAnswer: "",
    ansNumber: "",
  };
};

// ============================================================
// REMOVE ANSWER SECTION
// ============================================================

const removeAnswerSection = (
  text: string
): string => {
  return String(text || "")
    .replace(
      /\n\s*(?:correct\s+answer|correct\s+option|answer|ans)\s*[:.\-]?\s*\(?[A-D1-4]\)?[\s\S]*$/i,
      ""
    )
    .trim();
};

// ============================================================
// REMOVE TABLE LINES
// ============================================================

const removeTableLinesFromQuestion = (
  text: string
): string => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter(
      (line) =>
        !looksLikeTableLine(line)
    )
    .join("\n")
    .trim();
};

// ============================================================
// DETERMINE QUESTION TYPE
// ============================================================

const determineQuestionType = (
  text: string,
  tableHeaders: string[],
  tableRows: string[][]
): QuestionType => {
  if (
    tableHeaders.length >= 2 &&
    tableRows.length >= 1
  ) {
    return "TABLE";
  }

  if (
    detectDiagram(text) ||
    detectFigureReference(text)
  ) {
    return "DIAGRAM";
  }

  return "MCQ";
};

// ============================================================
// VALID QUESTION NUMBER
// ============================================================

const isValidQuestionNumber = (
  number: number
): boolean => {
  return (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 200
  );
};

// ============================================================
// PAGE / HEADER / FOOTER FILTER
// ============================================================

const isObviousNoiseLine = (
  line: string
): boolean => {
  const value = normalizeLine(line);

  if (!value) {
    return true;
  }

  // Pure page number
  if (/^\d{1,4}$/.test(value)) {
    return true;
  }

  // Page x
  if (
    /^(?:page|pg\.?)\s*\d+(?:\s*of\s*\d+)?$/i.test(
      value
    )
  ) {
    return true;
  }

  // Common PDF footer
  if (
    /^(?:www\.|https?:\/\/)/i.test(
      value
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// QUESTION BLOCK SPLITTER
// ============================================================

const splitQuestionBlocks = (
  text: string
): QuestionBlock[] => {
  const lines = normalizePdfText(
    text
  ).split("\n");

  const result: QuestionBlock[] = [];

  let currentChapter = "";
  let currentSection = "";

  let currentStart = -1;
  let currentNumber: number | null =
    null;

  let answerKeyMode = false;

  const flushCurrent = (
    endLine: number
  ) => {
    if (
      currentStart < 0 ||
      currentNumber === null
    ) {
      return;
    }

    const block = lines
      .slice(currentStart, endLine)
      .join("\n")
      .trim();

    if (!block) {
      return;
    }

    result.push({
      number: currentNumber,
      block,
      chapter: currentChapter,
      section: currentSection,
      position: currentStart,
    });
  };

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const rawLine = lines[i];
    const line = normalizeLine(rawLine);

    if (!line) {
      continue;
    }

    // --------------------------------------------------------
    // ANSWER KEY
    // --------------------------------------------------------

    if (isAnswerKeyHeading(line)) {
      flushCurrent(i);

      currentStart = -1;
      currentNumber = null;
      answerKeyMode = true;

      continue;
    }

    if (answerKeyMode) {
      // Ignore until another obvious content section/chapter
      if (
        isLikelyChapterHeading(
          line,
          lines[i - 1] || "",
          lines[i + 1] || ""
        )
      ) {
        answerKeyMode = false;
      } else {
        continue;
      }
    }

    // --------------------------------------------------------
    // CLASS / SECTION
    // --------------------------------------------------------

    const detectedSection =
      detectSection(lines, i);

    if (detectedSection) {
      currentSection =
        detectedSection;
      continue;
    }

    // --------------------------------------------------------
    // CHAPTER
    // --------------------------------------------------------

    if (
      isLikelyChapterHeading(
        line,
        lines[i - 1] || "",
        lines[i + 1] || ""
      )
    ) {
      // Do not treat a question line as chapter
      if (!isQuestionStartLine(line)) {
        flushCurrent(i);

        currentStart = -1;
        currentNumber = null;

        currentChapter =
          cleanChapterTitle(line);

        continue;
      }
    }

    // --------------------------------------------------------
    // NOISE
    // --------------------------------------------------------

    if (
      isObviousNoiseLine(line)
    ) {
      continue;
    }

    // --------------------------------------------------------
    // QUESTION
    // --------------------------------------------------------

    const number =
      getQuestionNumberFromLine(
        line
      );

    if (
      number !== null &&
      isValidQuestionNumber(number)
    ) {
      // IMPORTANT:
      // A number is accepted as question start only
      // when it has meaningful text after it.

      const match =
        line.match(
          QUESTION_START_REGEX
        );

      const questionTextAfterNumber =
        match?.[2]?.trim() || "";

      if (
        questionTextAfterNumber.length <
        2
      ) {
        continue;
      }

      flushCurrent(i);

      currentStart = i;
      currentNumber = number;

      continue;
    }

    // --------------------------------------------------------
    // CONTINUE CURRENT QUESTION
    // --------------------------------------------------------

    // Nothing needed here.
    // The line will automatically remain inside
    // current question until next question.
  }

  flushCurrent(lines.length);

  return result;
};

// ============================================================
// PARSE SINGLE QUESTION
// ============================================================

const parseSingleQuestion = (
  questionNumber: number,
  questionBlock: string,
  globalNumber: number,
  subjectQuestionNumber: number,
  chapter: string,
  subject: string
): ParsedQuestion => {
  const cleaned =
    cleanText(questionBlock);

  const table =
    parseTable(cleaned);

  const extracted =
    extractOptions(cleaned);

  const answer =
    extractAnswer(cleaned);

  let questionText =
    extracted.question;

  questionText =
    removeAnswerSection(
      questionText
    );

  if (
    table.headers.length > 0 &&
    table.rows.length > 0
  ) {
    questionText =
      removeTableLinesFromQuestion(
        questionText
      );
  }

  questionText =
    cleanText(questionText);

  const questionType =
    determineQuestionType(
      cleaned,
      table.headers,
      table.rows
    );

  return {
    // Original PDF number inside chapter
    questionNumber,

    // Continuous subject number
    subjectQuestionNumber,

    // Continuous complete PDF number
    globalQuestionNumber: globalNumber,

    question: questionText,

    options:
      extracted.options.slice(
        0,
        4
      ),

    correctAnswer:
      answer.correctAnswer,

    ansNumber:
      answer.ansNumber,

    questionType,

    tableHeaders:
      table.headers,

    tableRows:
      table.rows,

    imageUrl: "",

    questionImage: "",

    subject,

    chapter,

    subjectOrder:
      subjectQuestionNumber,

    aiGenerated: false,

    aiVerified: false,

    aiStatus:
      "not_checked",

    aiIssues: [],

    aiExplanation: "",
  };
};

// ============================================================
// VALIDATE QUESTION
// ============================================================

const isUsableQuestion = (
  question: ParsedQuestion
): boolean => {
  const questionText =
    question.question.trim();

  if (
    questionText.length < 5
  ) {
    return false;
  }

  // TABLE
  if (
    question.questionType ===
    "TABLE"
  ) {
    return (
      question.tableHeaders.length >=
        2 &&
      question.tableRows.length >=
        1
    );
  }

  // DIAGRAM
  if (
    question.questionType ===
    "DIAGRAM"
  ) {
    return (
      question.options.length ===
        0 ||
      question.options.length ===
        4
    );
  }

  // MCQ
  return (
    question.options.length === 4
  );
};

// ============================================================
// DUPLICATE KEY
// ============================================================

const makeQuestionKey = (
  question: ParsedQuestion
): string => {
  return [
    question.question
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),

    question.options
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  ].join("::");
};

// ============================================================
// DEDUPLICATE
// ============================================================

const deduplicateQuestions = (
  questions: ParsedQuestion[]
): ParsedQuestion[] => {
  const seen =
    new Set<string>();

  const result: ParsedQuestion[] =
    [];

  for (const question of questions) {
    const key =
      makeQuestionKey(
        question
      );

    if (
      !key ||
      key === "::"
    ) {
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(question);
  }

  return result;
};

// ============================================================
// RE-NUMBER
// ============================================================

const normalizeQuestions = (
  questions: ParsedQuestion[]
): ParsedQuestion[] => {
  return questions.map(
    (question, index) => ({
      ...question,

      // Global continuous numbering
      globalQuestionNumber:
        index + 1,

      // Keep original PDF local number
      questionNumber:
        question.questionNumber,

      // Keep continuous subject numbering
      subjectQuestionNumber:
        question.subjectQuestionNumber,

      options:
        Array.isArray(
          question.options
        )
          ? question.options.slice(
              0,
              4
            )
          : [],

      tableHeaders:
        Array.isArray(
          question.tableHeaders
        )
          ? question.tableHeaders
          : [],

      tableRows:
        Array.isArray(
          question.tableRows
        )
          ? question.tableRows
          : [],

      imageUrl:
        question.imageUrl || "",

      questionImage:
        question.questionImage ||
        question.imageUrl ||
        "",

      aiStatus:
        question.aiStatus ||
        "not_checked",

      aiIssues:
        Array.isArray(
          question.aiIssues
        )
          ? question.aiIssues
          : [],
    })
  );
};

// ============================================================
// MAIN PARSER
// ============================================================

export const parseQuestions = (
  rawText: string,
  options?: {
    subject?: string;
    defaultChapter?: string;
  }
): ParsedQuestion[] => {
  if (
    !rawText ||
    !rawText.trim()
  ) {
    console.warn(
      "PDF PARSER: Empty text"
    );

    return [];
  }

  const subject =
    options?.subject ||
    "Physics";

  const defaultChapter =
    options?.defaultChapter ||
    "";

  const cleanedText =
    normalizePdfText(
      rawText
    );

  console.log(
    "=========================================="
  );

  console.log(
    "SMART PDF QUESTION PARSER STARTED"
  );

  console.log(
    "TEXT LENGTH:",
    cleanedText.length
  );

  console.log(
    "=========================================="
  );

  // ----------------------------------------------------------
  // SPLIT INTO QUESTION BLOCKS
  // ----------------------------------------------------------

  const blocks =
    splitQuestionBlocks(
      cleanedText
    );

  console.log(
    "RAW QUESTION BLOCKS:",
    blocks.length
  );

  if (!blocks.length) {
    console.warn(
      "PDF PARSER: No valid question blocks found"
    );

    return [];
  }

  // ----------------------------------------------------------
  // CONTINUOUS COUNTERS
  // ----------------------------------------------------------

  let globalQuestionNumber = 0;

  let subjectQuestionNumber = 0;

  // ----------------------------------------------------------
  // PARSE
  // ----------------------------------------------------------

  const parsedQuestions =
    blocks.map(
      (item) => {
        globalQuestionNumber++;

        subjectQuestionNumber++;

        const chapter =
          item.chapter ||
          defaultChapter;

        const parsed =
          parseSingleQuestion(
            item.number,

            item.block,

            globalQuestionNumber,

            subjectQuestionNumber,

            chapter,

            subject
          );

        console.log(
          `PDF Q${item.number} → GLOBAL Q${globalQuestionNumber}`,
          "| chapter:",
          chapter || "UNKNOWN",
          "|",
          parsed.questionType,
          "| options:",
          parsed.options.length
        );

        return parsed;
      }
    );

  // ----------------------------------------------------------
  // VALIDATE
  // ----------------------------------------------------------

  const validQuestions =
    parsedQuestions.filter(
      isUsableQuestion
    );

  console.log(
    "VALID QUESTIONS:",
    validQuestions.length
  );

  console.log(
    "REMOVED INVALID:",
    parsedQuestions.length -
      validQuestions.length
  );

  // ----------------------------------------------------------
  // DEDUPLICATE
  // ----------------------------------------------------------

  const uniqueQuestions =
    deduplicateQuestions(
      validQuestions
    );

  console.log(
    "UNIQUE QUESTIONS:",
    uniqueQuestions.length
  );

  // ----------------------------------------------------------
  // RE-NUMBER AFTER DUPLICATES
  // ----------------------------------------------------------

  const normalized =
    normalizeQuestions(
      uniqueQuestions
    );

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const mcqCount =
    normalized.filter(
      (q) =>
        q.questionType ===
        "MCQ"
    ).length;

  const tableCount =
    normalized.filter(
      (q) =>
        q.questionType ===
        "TABLE"
    ).length;

  const diagramCount =
    normalized.filter(
      (q) =>
        q.questionType ===
        "DIAGRAM"
    ).length;

  const chapters =
    new Set(
      normalized
        .map((q) =>
          q.chapter.trim()
        )
        .filter(Boolean)
    );

  console.log(
    "=========================================="
  );

  console.log(
    "PDF PARSING COMPLETED"
  );

  console.log(
    "RAW BLOCKS:",
    blocks.length
  );

  console.log(
    "VALID:",
    validQuestions.length
  );

  console.log(
    "UNIQUE:",
    uniqueQuestions.length
  );

  console.log(
    "FINAL:",
    normalized.length
  );

  console.log(
    "MCQ:",
    mcqCount
  );

  console.log(
    "TABLE:",
    tableCount
  );

  console.log(
    "DIAGRAM:",
    diagramCount
  );

  console.log(
    "CHAPTERS:",
    chapters.size
  );

  console.log(
    "=========================================="
  );

  return normalized;
};

// ============================================================
// TABLE HELPER
// ============================================================

export const parseTableFromText = (
  text: string
) => {
  return parseTable(text);
};

// ============================================================
// DIAGRAM HELPER
// ============================================================

export const isDiagramQuestion = (
  text: string
): boolean => {
  return (
    detectDiagram(text) ||
    detectFigureReference(text)
  );
};

// ============================================================
// QUESTION TYPE HELPER
// ============================================================

export const getQuestionType = (
  text: string
): QuestionType => {
  const table =
    parseTable(text);

  return determineQuestionType(
    text,
    table.headers,
    table.rows
  );
};

// ============================================================
// CHAPTER HELPER
// ============================================================

export const detectChapterFromText = (
  text: string
): string => {
  const lines =
    normalizePdfText(
      text
    ).split("\n");

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      normalizeLine(lines[i]);

    if (
      isLikelyChapterHeading(
        line,
        lines[i - 1] || "",
        lines[i + 1] || ""
      )
    ) {
      return cleanChapterTitle(
        line
      );
    }
  }

  return "";
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default parseQuestions;