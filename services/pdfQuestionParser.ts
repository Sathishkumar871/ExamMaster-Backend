// services/pdfQuestionParser.ts

// ============================================================
// EXAMMASTER - SMART PDF QUESTION PARSER
// ============================================================
//
// PDF NUNDI:
//
// ✅ Main Questions
// ✅ MCQ Options
// ✅ Tables
// ✅ Diagram / Figure references
// ✅ Answer information
//
// PDF NUNDI DETECT CHEYYADU:
//
// ❌ Chapter
// ❌ Subject
// ❌ Language
//
// CONTROLLER NUNDI VACHINA VALUES:
//
// ✅ Subject
// ✅ Chapter
// ✅ Language
//
// STRONG PROTECTION:
//
// ✅ Dates ignored
// ✅ Years ignored
// ✅ Time ignored
// ✅ Marks ignored
// ✅ Exam metadata ignored
// ✅ Headers ignored
// ✅ Instructions ignored
// ✅ Section headings ignored
// ✅ (1)(2)(3)(4) handled as options
// ✅ I/II/III handled as statements
// ✅ Options never become new questions
// ✅ Question context maintained until next real question
// ✅ Duplicate questions removed
//
// ============================================================

export type QuestionType =
  | "MCQ"
  | "TABLE"
  | "DIAGRAM";

export type AIStatus =
  | "pending"
  | "correct"
  | "wrong"
  | "not_checked";

export interface ParsedQuestion {
  questionNumber: number;

  subjectQuestionNumber: number;

  globalQuestionNumber: number;

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

  language?: string;

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
  position: number;
}

interface InlineOptionMatch {
  label: string;
  text: string;
  index: number;
}

// ============================================================
// TEXT CLEANING
// ============================================================

const cleanText = (
  value: string
): string => {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeLine = (
  value: string
): string => {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// NORMALIZE PDF
// ============================================================

const normalizePdfText = (
  value: string
): string => {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ============================================================
// REMOVE QUESTION NUMBER
// ============================================================

const removeQuestionNumber = (
  value: string
): string => {
  return String(value || "")
    .replace(
      /^\s*(?:(?:Q|Question|Que)\s*\.?\s*(?:No\.?\s*)?)?\d{1,4}\s*[.)\-:]\s*/i,
      ""
    )
    .replace(
      /^\s*(?:Q|Question|Que)\s*\.?\s*\d{1,4}\s+/i,
      ""
    )
    .trim();
};

// ============================================================
// DATE DETECTION
// ============================================================

const isDateLike = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (!text) {
    return false;
  }

  // 01/03/2026
  // 01-03-2026
  // 01.03.2026
  if (
    /^(?:date\s*[:\-]?\s*)?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/i.test(
      text
    )
  ) {
    return true;
  }

  // 2026/03/01
  // 2026-03-01
  // 2026.03.01
  if (
    /^(?:date\s*[:\-]?\s*)?\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}$/i.test(
      text
    )
  ) {
    return true;
  }

  // 1 March 2026
  if (
    /^(?:date\s*[:\-]?\s*)?\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+\d{4}$/i.test(
      text
    )
  ) {
    return true;
  }

  // March 1, 2026
  if (
    /^(?:date\s*[:\-]?\s*)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}$/i.test(
      text
    )
  ) {
    return true;
  }

  // Exam Date: ...
  if (
    /^(?:exam\s+date|test\s+date|date)\s*[:\-]/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// DATE / YEAR RANGE
// ============================================================

const isYearRange = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  // 2025-26
  // 2025/26
  // 2025-2026
  return /^(?:19|20)\d{2}\s*[-\/]\s*(?:\d{2}|\d{4})$/.test(
    text
  );
};

// ============================================================
// YEAR ONLY
// ============================================================

const isYearOnly = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  return /^(?:19|20)\d{2}$/.test(
    text
  );
};

// ============================================================
// TIME
// ============================================================

const isTimeLike = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (
    /^(?:time|timing|duration)\s*[:\-]/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /^\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?$/i.test(
      text
    )
  ) {
    return true;
  }

  // 3 Hours
  // 180 Minutes
  if (
    /^\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?)$/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// METADATA
// ============================================================

const isMetadataLine = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (!text) {
    return true;
  }

  // Dates
  if (
    isDateLike(text)
  ) {
    return true;
  }

  // Years
  if (
    isYearOnly(text)
  ) {
    return true;
  }

  // Academic year
  if (
    isYearRange(text)
  ) {
    return true;
  }

  // Time
  if (
    isTimeLike(text)
  ) {
    return true;
  }

  // Max marks
  if (
    /^(?:maximum|max\.?|total)\s+marks?\s*[:\-]?\s*\d+/i.test(
      text
    )
  ) {
    return true;
  }

  // Duration
  if (
    /^(?:duration|time)\s*[:\-]?\s*\d+/i.test(
      text
    )
  ) {
    return true;
  }

  // Roll number etc.
  if (
    /^(?:roll\s*(?:no|number)?|registration\s*(?:no|number)?|application\s*(?:no|number)?|candidate\s*(?:id|no|number)?|student\s*(?:id|no|number)?)\s*[:\-]/i.test(
      text
    )
  ) {
    return true;
  }

  // Paper code
  if (
    /^(?:paper\s*code|question\s*paper\s*code|set\s*code)\s*[:\-]?\s*[A-Z0-9]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // Set A / Paper A
  if (
    /^(?:set|paper)\s+[A-Z0-9]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // Question paper number/code
  if (
    /^(?:question\s*paper|paper)\s*(?:no|number|code)?\s*[:\-]\s*[A-Z0-9-]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // Session
  if (
    /^(?:session|academic\s*year)\s*[:\-]/i.test(
      text
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// UNWANTED HEADINGS
// ============================================================

const UNWANTED_HEADINGS = [
  "physics",
  "chemistry",
  "mathematics",
  "maths",
  "math",
  "biology",
  "botany",
  "zoology",

  "section",
  "section a",
  "section b",
  "section c",
  "section d",

  "part a",
  "part b",
  "part c",
  "part d",

  "general instructions",
  "instructions",
  "important instructions",
  "special instructions",
  "exam instructions",

  "question paper",
  "question papers",

  "multiple choice questions",
  "multiple choice question",
  "multiple choice",
  "mcq",

  "questions",
  "question",

  "contents",
  "index",

  "answer key",
  "answers",
  "solutions",
  "answer sheet",
  "correct answers",
  "correct options",

  "neet",
  "neet ug",
  "jee",
  "jee mains",

  "1st puc",
  "2nd puc",

  "read carefully",
  "read the following carefully",
  "read the following instructions carefully",
];

// ============================================================
// KNOWN HEADING
// ============================================================

const isKnownHeading = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (!text) {
    return true;
  }

  const lower =
    text.toLowerCase();

  if (
    UNWANTED_HEADINGS.includes(
      lower
    )
  ) {
    return true;
  }

  // Section A
  if (
    /^section\s+[A-Z0-9IVX]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // Part A
  if (
    /^part\s+[A-Z0-9IVX]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // Section - A
  if (
    /^section\s*[-:]\s*[A-Z0-9IVX]+$/i.test(
      text
    )
  ) {
    return true;
  }

  // General Instructions
  if (
    /^(?:general|important|special|exam)\s+instructions?\b/i.test(
      text
    )
  ) {
    return true;
  }

  // All-uppercase small headings
  const letters =
    text.replace(
      /[^A-Za-z]/g,
      ""
    );

  if (
    letters.length >= 4 &&
    letters.length <= 50 &&
    text === text.toUpperCase() &&
    !text.includes("?") &&
    !/[=+\-*/<>]/.test(text)
  ) {
    return true;
  }

  return false;
};

// ============================================================
// INSTRUCTION
// ============================================================

const isInstructionLine = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (!text) {
    return true;
  }

  const patterns = [
    /^each question\b/i,
    /^all questions\b/i,
    /^attempt all\b/i,
    /^attempt any\b/i,
    /^answer all\b/i,
    /^answer any\b/i,
    /^choose the correct\b/i,
    /^select the correct\b/i,
    /^mark the correct\b/i,
    /^read the following\b/i,
    /^for each question\b/i,
    /^each carries\b/i,
    /^each carry\b/i,
    /^one mark\b/i,
    /^two marks\b/i,
    /^three marks\b/i,
    /^four marks\b/i,
    /^five marks\b/i,
    /^use of calculator\b/i,
    /^use the following\b/i,
    /^negative marking\b/i,
    /^there is no negative\b/i,
    /^questions are compulsory\b/i,
  ];

  return patterns.some(
    (pattern) =>
      pattern.test(text)
  );
};

// ============================================================
// ROMAN STATEMENT
// ============================================================
//
// I. ...
// II. ...
// III. ...
//
// These are question content,
// NOT separate questions.
// ============================================================

const ROMAN_STATEMENT_REGEX =
  /^\s*(I{1,3}|IV|V)\s*[.)\-:]\s+(.+)$/i;

const isRomanStatement = (
  line: string
): boolean => {
  return ROMAN_STATEMENT_REGEX.test(
    normalizeLine(line)
  );
};

// ============================================================
// NUMERIC OPTION
// ============================================================
//
// (1) I only
// (2) II only
// 1) A
// 2) B
// ============================================================

const NUMERIC_OPTION_REGEX =
  /^\s*(?:\(([1-4])\)|([1-4])[.)\-:])\s+(.+)$/i;

// ============================================================
// LETTER OPTION
// ============================================================
//
// (A) ...
// A) ...
// A. ...
// A- ...
// ============================================================

const LETTER_OPTION_REGEX =
  /^\s*(?:\(([A-D])\)|([A-D])[.)\-:])\s+(.+)$/i;

// ============================================================
// ROMAN OPTION
// ============================================================
//
// (i) ...
// i) ...
//
// Only useful when actual option text exists.
// ============================================================

const ROMAN_OPTION_REGEX =
  /^\s*(?:\(([ivxlcdm]{1,4})\)|([ivxlcdm]{1,4})[.)\-:])\s+(.+)$/i;

// ============================================================
// OPTION LINE
// ============================================================

const isOptionLine = (
  line: string
): boolean => {
  const value =
    normalizeLine(line);

  return (
    NUMERIC_OPTION_REGEX.test(
      value
    ) ||
    LETTER_OPTION_REGEX.test(
      value
    ) ||
    ROMAN_OPTION_REGEX.test(
      value
    )
  );
};

// ============================================================
// OPTION LABEL
// ============================================================

const getOptionLabel = (
  line: string
): string => {
  const value =
    normalizeLine(line);

  const numeric =
    value.match(
      NUMERIC_OPTION_REGEX
    );

  if (numeric) {
    return String(
      numeric[1] ||
        numeric[2] ||
        ""
    ).toUpperCase();
  }

  const letter =
    value.match(
      LETTER_OPTION_REGEX
    );

  if (letter) {
    return String(
      letter[1] ||
        letter[2] ||
        ""
    ).toUpperCase();
  }

  const roman =
    value.match(
      ROMAN_OPTION_REGEX
    );

  if (roman) {
    return String(
      roman[1] ||
        roman[2] ||
        ""
    ).toUpperCase();
  }

  return "";
};

// ============================================================
// OPTION TEXT
// ============================================================

const getOptionText = (
  line: string
): string => {
  const value =
    normalizeLine(line);

  const numeric =
    value.match(
      NUMERIC_OPTION_REGEX
    );

  if (numeric) {
    return String(
      numeric[3] || ""
    ).trim();
  }

  const letter =
    value.match(
      LETTER_OPTION_REGEX
    );

  if (letter) {
    return String(
      letter[3] || ""
    ).trim();
  }

  const roman =
    value.match(
      ROMAN_OPTION_REGEX
    );

  if (roman) {
    return String(
      roman[3] || ""
    ).trim();
  }

  return "";
};

// ============================================================
// INLINE OPTION
// ============================================================
//
// A) 10 B) 20 C) 30 D) 40
// (A) 10 (B) 20 (C) 30 (D) 40
// 1) 10 2) 20 3) 30 4) 40
// ============================================================

const INLINE_OPTION_REGEX =
  /(?:^|\s)\(?([A-D1-4])\)?[.)\-:]\s+/gi;

const extractInlineOptionsFromLine = (
  line: string
): InlineOptionMatch[] => {
  const value =
    normalizeLine(line);

  if (!value) {
    return [];
  }

  const matches: Array<{
    label: string;
    index: number;
    markerLength: number;
  }> = [];

  INLINE_OPTION_REGEX.lastIndex = 0;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      INLINE_OPTION_REGEX.exec(
        value
      )) !== null
  ) {
    matches.push({
      label:
        String(
          match[1] || ""
        ).toUpperCase(),

      index:
        match.index,

      markerLength:
        match[0].length,
    });
  }

  if (!matches.length) {
    return [];
  }

  const result:
    InlineOptionMatch[] =
    [];

  for (
    let i = 0;
    i < matches.length;
    i++
  ) {
    const current =
      matches[i];

    const start =
      current.index +
      current.markerLength;

    const end =
      i + 1 <
      matches.length
        ? matches[i + 1]
            .index
        : value.length;

    const optionText =
      value
        .slice(
          start,
          end
        )
        .trim();

    if (
      !optionText
    ) {
      continue;
    }

    result.push({
      label:
        current.label,

      text:
        optionText,

      index:
        current.index,
    });
  }

  return result;
};

// ============================================================
// QUESTION REGEX
// ============================================================
//
// Supported:
//
// 1. What...
// 1) What...
// 1: What...
// Q1. What...
// Q.1 What...
// Question 1. What...
// Question No. 1: What...
// ============================================================

const QUESTION_START_REGEX =
  /^\s*(?:(?:Q|Question|Que)\s*\.?\s*(?:No\.?\s*)?)?(\d{1,4})\s*[.)\-:]\s*(.+)$/i;

const QUESTION_WORD_START_REGEX =
  /^\s*(?:Question|Que)\s*(?:No\.?\s*)?(\d{1,4})\s*[.)\-:]\s*(.+)$/i;

const STANDALONE_QUESTION_NUMBER_REGEX =
  /^\s*(?:(?:Q|Question|Que)\s*\.?\s*(?:No\.?\s*)?)?(\d{1,4})\s*[.)\-:]?\s*$/i;

// ============================================================
// QUESTION TEXT CHECK
// ============================================================

const isLikelyRealQuestionText = (
  value: string
): boolean => {
  const text =
    normalizeLine(value);

  if (!text) {
    return false;
  }

  if (
    text.length < 4
  ) {
    return false;
  }

  if (
    isMetadataLine(text)
  ) {
    return false;
  }

  if (
    isKnownHeading(text)
  ) {
    return false;
  }

  if (
    isInstructionLine(text)
  ) {
    return false;
  }

  // Pure numeric/symbol data
  if (
    /^[\d\s.,:;+\-*/=()]+$/.test(
      text
    )
  ) {
    return false;
  }

  // Option-like text
  if (
    /^(?:\([1-4A-D]\)|[1-4A-D][.)\-:])\s+/i.test(
      text
    )
  ) {
    return false;
  }

  // Roman statement cannot be a question start
  if (
    isRomanStatement(text)
  ) {
    return false;
  }

  // Strong question markers
  if (
    text.includes("?")
  ) {
    return true;
  }

  // Natural question language
  if (
    /\b(?:what|which|why|how|when|where|find|calculate|determine|identify|consider|given|following|according|correct|incorrect|true|false|value|statement|statements|equation|reaction|velocity|force|mass|energy|current|resistance|pressure|temperature|charge|potential|frequency|wavelength|work|power|momentum|acceleration|probability|function|integral|derivative)\b/i.test(
      text
    )
  ) {
    return true;
  }

  // General fallback
  if (
    text.length >= 20 &&
    text.split(/\s+/).length >= 4 &&
    /[A-Za-z]/.test(text)
  ) {
    return true;
  }

  return false;
};

// ============================================================
// QUESTION START CHECK
// ============================================================
//
// IMPORTANT:
//
// Option detection has priority.
//
// (1) ...
// (2) ...
//
// can never become Q1/Q2.
// ============================================================

const isRealQuestionStart = (
  line: string,
  currentQuestionNumber:
    | number
    | null
): boolean => {
  const value =
    normalizeLine(line);

  if (!value) {
    return false;
  }

  // ----------------------------------------------------------
  // OPTION FIRST
  // ----------------------------------------------------------

  if (
    isOptionLine(value)
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // METADATA
  // ----------------------------------------------------------

  if (
    isMetadataLine(value)
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // HEADINGS
  // ----------------------------------------------------------

  if (
    isKnownHeading(value)
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // INSTRUCTIONS
  // ----------------------------------------------------------

  if (
    isInstructionLine(value)
  ) {
    return false;
  }

  let match =
    value.match(
      QUESTION_START_REGEX
    );

  if (!match) {
    match =
      value.match(
        QUESTION_WORD_START_REGEX
      );
  }

  if (!match) {
    return false;
  }

  const number =
    Number(match[1]);

  const text =
    String(
      match[2] || ""
    ).trim();

  if (
    !Number.isInteger(
      number
    ) ||
    number < 1 ||
    number > 10000
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // QUESTION NUMBERS SHOULD MOVE FORWARD
  // ----------------------------------------------------------
  //
  // Example:
  //
  // Q25 ...
  // 1) ...
  //
  // `1)` already rejected as option.
  //
  // This also protects duplicate headers.
  // ----------------------------------------------------------

  if (
    currentQuestionNumber !== null &&
    number <= currentQuestionNumber
  ) {
    return false;
  }

  return isLikelyRealQuestionText(
    text
  );
};

// ============================================================
// QUESTION NUMBER
// ============================================================

const getQuestionNumberFromLine = (
  line: string
): number | null => {
  const value =
    normalizeLine(line);

  // Options are NOT questions.
  if (
    isOptionLine(value)
  ) {
    return null;
  }

  // Metadata is NOT questions.
  if (
    isMetadataLine(value)
  ) {
    return null;
  }

  let match =
    value.match(
      QUESTION_START_REGEX
    );

  if (!match) {
    match =
      value.match(
        QUESTION_WORD_START_REGEX
      );
  }

  if (!match) {
    match =
      value.match(
        STANDALONE_QUESTION_NUMBER_REGEX
      );
  }

  if (!match) {
    return null;
  }

  const number =
    Number(match[1]);

  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 10000
  ) {
    return null;
  }

  return number;
};

// ============================================================
// QUESTION TEXT
// ============================================================

const getQuestionTextAfterNumber = (
  line: string
): string => {
  const value =
    normalizeLine(line);

  let match =
    value.match(
      QUESTION_START_REGEX
    );

  if (!match) {
    match =
      value.match(
        QUESTION_WORD_START_REGEX
      );
  }

  if (!match) {
    return "";
  }

  return String(
    match[2] || ""
  ).trim();
};

// ============================================================
// STANDALONE QUESTION NUMBER
// ============================================================
//
// 25
// Which ...
//
// Allowed.
//
// But:
//
// 1
// I only
//
// Not allowed.
// ============================================================

const isStandaloneQuestionNumber = (
  lines: string[],
  index: number,
  currentQuestionNumber:
    | number
    | null
): boolean => {
  const line =
    normalizeLine(
      lines[index]
    );

  if (
    !STANDALONE_QUESTION_NUMBER_REGEX.test(
      line
    )
  ) {
    return false;
  }

  // Number itself
  const number =
    getQuestionNumberFromLine(
      line
    );

  if (
    number === null
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // Bare 1-4 are usually NOT standalone question numbers.
  // ----------------------------------------------------------

  if (
    number >= 1 &&
    number <= 4
  ) {
    return false;
  }

  if (
    currentQuestionNumber !== null &&
    number <=
      currentQuestionNumber
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // Find next meaningful line.
  // ----------------------------------------------------------

  for (
    let i =
      index + 1;
    i < lines.length;
    i++
  ) {
    const next =
      normalizeLine(
        lines[i]
      );

    if (!next) {
      continue;
    }

    if (
      isMetadataLine(next)
    ) {
      continue;
    }

    if (
      isKnownHeading(next)
    ) {
      continue;
    }

    if (
      isOptionLine(next)
    ) {
      return false;
    }

    if (
      isRomanStatement(next)
    ) {
      return false;
    }

    return isLikelyRealQuestionText(
      next
    );
  }

  return false;
};

// ============================================================
// ANSWER KEY
// ============================================================

const ANSWER_KEY_HEADINGS = [
  /^answer\s*key$/i,
  /^answer\s+keys?$/i,
  /^answers?$/i,
  /^answers?\s+key$/i,
  /^answer\s+and\s+solutions?$/i,
  /^answers\s+and\s+solutions$/i,
  /^solutions?$/i,
  /^answer\s+sheet$/i,
  /^correct\s+answers?$/i,
  /^correct\s+options?$/i,
  /^key$/i,
];

const isAnswerKeyHeading = (
  line: string
): boolean => {
  const value =
    normalizeLine(line);

  return ANSWER_KEY_HEADINGS.some(
    (pattern) =>
      pattern.test(value)
  );
};

const isAnswerKeyContentLine = (
  line: string
): boolean => {
  const value =
    normalizeLine(line);

  if (!value) {
    return false;
  }

  // Answer: A
  // Ans: 1
  if (
    /\b(?:answer|ans|correct\s+answer|correct\s+option)\b\s*[:.\-]?\s*\(?[A-D1-4]\)?\b/i.test(
      value
    )
  ) {
    return true;
  }

  // 1-A
  // 2)B
  // 3-C
  if (
    /^\s*\d{1,4}\s*[-.)]\s*\(?[A-D1-4]\)?\b/i.test(
      value
    )
  ) {
    return true;
  }

  // 1 A 2 B 3 C
  if (
    /^\s*(?:\d{1,4}\s*[A-D]\s*){4,}$/i.test(
      value
    )
  ) {
    return true;
  }

  // Compact key
  if (
    /^\s*(?:[1-4A-D]\s*){8,}$/i.test(
      value
    )
  ) {
    return true;
  }

  return false;
};

// ============================================================
// TABLE
// ============================================================

const looksLikeTableLine = (
  line: string
): boolean => {
  const original =
    String(line || "");

  const value =
    normalizeLine(original);

  if (!value) {
    return false;
  }

  if (
    value.includes("|")
  ) {
    return true;
  }

  if (
    original.includes("\t")
  ) {
    return true;
  }

  if (
    /\S+\s{3,}\S+/.test(
      original
    )
  ) {
    return true;
  }

  return false;
};

const splitTableRow = (
  line: string
): string[] => {
  const value =
    String(line || "")
      .trim();

  if (
    value.includes("|")
  ) {
    return value
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(
        (cell) =>
          cell.trim()
      )
      .filter(Boolean);
  }

  if (
    value.includes("\t")
  ) {
    return value
      .split("\t")
      .map(
        (cell) =>
          cell.trim()
      )
      .filter(Boolean);
  }

  return value
    .split(/\s{3,}/)
    .map(
      (cell) =>
        cell.trim()
    )
    .filter(Boolean);
};

const isTableSeparator = (
  row: string[]
): boolean => {
  if (!row.length) {
    return false;
  }

  return row.every(
    (cell) =>
      /^[-:]+$/.test(
        cell.trim()
      )
  );
};

const parseTable = (
  text: string
): {
  headers: string[];
  rows: string[][];
} => {
  const lines =
    String(text || "")
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const tableLines =
    lines.filter(
      looksLikeTableLine
    );

  if (
    tableLines.length < 2
  ) {
    return {
      headers: [],
      rows: [],
    };
  }

  const parsedRows =
    tableLines
      .map(splitTableRow)
      .filter(
        (row) =>
          row.length >= 2
      );

  if (
    parsedRows.length < 2
  ) {
    return {
      headers: [],
      rows: [],
    };
  }

  const filteredRows =
    parsedRows.filter(
      (row) =>
        !isTableSeparator(
          row
        )
    );

  if (
    filteredRows.length < 2
  ) {
    return {
      headers: [],
      rows: [],
    };
  }

  return {
    headers:
      filteredRows[0],

    rows:
      filteredRows.slice(1),
  };
};

// ============================================================
// EXTRACT OPTIONS
// ============================================================
//
// VERY IMPORTANT:
//
// This function does NOT decide where questions start.
// It only processes the already-created question block.
//
// Therefore:
//
// Q25
// I. ...
// II. ...
// III. ...
// (1) I only
// (2) II only
// (3) I and III
// (4) I and II
//
// remains Q25.
// ============================================================

const extractOptions = (
  text: string
): {
  question: string;
  options: string[];
} => {
  const lines =
    String(text || "")
      .split("\n")
      .map(normalizeLine)
      .filter(Boolean);

  const questionLines: string[] =
    [];

  const options: string[] =
    [];

  let optionStarted =
    false;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      lines[i];

    if (!line) {
      continue;
    }

    // ========================================================
    // INLINE OPTIONS
    // ========================================================

    const inlineOptions =
      extractInlineOptionsFromLine(
        line
      );

    if (
      inlineOptions.length >= 2
    ) {
      optionStarted = true;

      for (
        const item
        of inlineOptions
      ) {
        if (
          item.text
        ) {
          options.push(
            item.text
          );
        }
      }

      continue;
    }

    // ========================================================
    // LETTER OPTION
    // ========================================================

    const letterMatch =
      line.match(
        LETTER_OPTION_REGEX
      );

    if (
      letterMatch
    ) {
      optionStarted = true;

      const optionText =
        String(
          letterMatch[3] ||
            ""
        ).trim();

      if (
        optionText
      ) {
        options.push(
          optionText
        );
      }

      continue;
    }

    // ========================================================
    // NUMERIC OPTION
    // ========================================================

    const numericMatch =
      line.match(
        NUMERIC_OPTION_REGEX
      );

    if (
      numericMatch
    ) {
      optionStarted = true;

      const optionText =
        String(
          numericMatch[3] ||
            ""
        ).trim();

      if (
        optionText
      ) {
        options.push(
          optionText
        );
      }

      continue;
    }

    // ========================================================
    // ROMAN OPTION
    // ========================================================

    const romanOptionMatch =
      line.match(
        ROMAN_OPTION_REGEX
      );

    if (
      romanOptionMatch &&
      !isRomanStatement(line)
    ) {
      optionStarted = true;

      const optionText =
        String(
          romanOptionMatch[3] ||
            ""
        ).trim();

      if (
        optionText
      ) {
        options.push(
          optionText
        );
      }

      continue;
    }

    // ========================================================
    // ANSWER KEY
    // ========================================================

    if (
      isAnswerKeyHeading(
        line
      )
    ) {
      continue;
    }

    // ========================================================
    // METADATA INSIDE QUESTION BLOCK
    // ========================================================

    if (
      isMetadataLine(line)
    ) {
      continue;
    }

    // ========================================================
    // OPTION CONTINUATION
    // ========================================================

    if (
      optionStarted &&
      options.length > 0
    ) {
      // Roman statements should remain question content
      // only if they occur before options.
      if (
        isRomanStatement(line)
      ) {
        options[
          options.length - 1
        ] =
          `${options[options.length - 1]} ${line}`
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        continue;
      }

      // Do not append obvious headings.
      if (
        isKnownHeading(line)
      ) {
        continue;
      }

      options[
        options.length - 1
      ] =
        `${options[options.length - 1]} ${line}`
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      continue;
    }

    // ========================================================
    // QUESTION CONTENT
    // ========================================================

    questionLines.push(
      line
    );
  }

  // ==========================================================
  // INLINE FALLBACK
  // ==========================================================

  if (
    options.length === 0 &&
    questionLines.length > 0
  ) {
    const combined =
      questionLines.join(" ");

    const inlineOptions =
      extractInlineOptionsFromLine(
        combined
      );

    if (
      inlineOptions.length >= 2
    ) {
      const first =
        inlineOptions[0];

      return {
        question:
          removeQuestionNumber(
            combined.slice(
              0,
              first.index
            )
          ),

        options:
          inlineOptions
            .map(
              (item) =>
                item.text
            )
            .filter(Boolean)
            .slice(0, 4),
      };
    }
  }

  return {
    question:
      removeQuestionNumber(
        questionLines.join(" ")
      ),

    options:
      options
        .map(
          (option) =>
            option
              .replace(
                /\s+/g,
                " "
              )
              .trim()
        )
        .filter(Boolean)
        .slice(0, 4),
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
    /\b(?:correct\s+answer|correct\s+option|answer|ans)\s*[:.\-]?\s*\(?([A-D1-4])\)?\b/i,
    /\b(?:correct\s+answer|correct\s+option)\s*(?:is|=)\s*\(?([A-D1-4])\)?\b/i,
  ];

  for (
    const pattern
    of patterns
  ) {
    const match =
      text.match(
        pattern
      );

    if (!match) {
      continue;
    }

    const answer =
      String(
        match[1] || ""
      )
        .trim()
        .toUpperCase();

    if (
      ["A", "B", "C", "D"].includes(
        answer
      )
    ) {
      return {
        correctAnswer:
          answer,

        ansNumber:
          String(
            answer.charCodeAt(0) -
              64
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

        ansNumber:
          answer,
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
      /\n\s*(?:correct\s+answer|correct\s+option|answer|ans)\s*[:.\-]?\s*\(?[A-D1-4]\)?(?:\s*\n|\s*$)[\s\S]*$/i,
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
  const lines =
    text
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  return lines
    .filter(
      (line) =>
        !looksLikeTableLine(
          line
        )
    )
    .join("\n")
    .trim();
};

// ============================================================
// DETERMINE TYPE
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
// DIAGRAM
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
  "according to the diagram",
  "according to the figure",
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

const detectDiagram = (
  text: string
): boolean => {
  const lower =
    String(text || "")
      .toLowerCase();

  return DIAGRAM_KEYWORDS.some(
    (keyword) =>
      lower.includes(keyword)
  );
};

const detectFigureReference = (
  text: string
): boolean => {
  const lower =
    String(text || "")
      .toLowerCase();

  const patterns = [
    /\bfig\.?\s*\d+/i,
    /\bfigure\s+\d+/i,
    /\bdiagram\s+\d+/i,
    /\bimage\s+\d+/i,
  ];

  return patterns.some(
    (pattern) =>
      pattern.test(lower)
  );
};

// ============================================================
// PARSE SINGLE QUESTION
// ============================================================

const parseSingleQuestion = (
  questionNumber: number,
  questionBlock: string,
  globalNumber: number,
  subjectQuestionNumber: number,
  subject: string,
  chapter: string,
  language?: string
): ParsedQuestion => {
  const cleaned =
    cleanText(
      questionBlock
    );

  const table =
    parseTable(
      cleaned
    );

  const extracted =
    extractOptions(
      cleaned
    );

  const answer =
    extractAnswer(
      cleaned
    );

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
    cleanText(
      questionText
    );

  const questionType =
    determineQuestionType(
      cleaned,
      table.headers,
      table.rows
    );

  return {
    questionNumber,

    subjectQuestionNumber,

    globalQuestionNumber:
      globalNumber,

    question:
      questionText,

    options:
      extracted.options
        .slice(0, 4),

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

    language,

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
    normalizeLine(
      question.question
    );

  if (
    questionText.length < 4
  ) {
    return false;
  }

  if (
    isMetadataLine(
      questionText
    )
  ) {
    return false;
  }

  if (
    isKnownHeading(
      questionText
    )
  ) {
    return false;
  }

  if (
    isInstructionLine(
      questionText
    )
  ) {
    return false;
  }

  if (
    question.questionType ===
    "TABLE"
  ) {
    return true;
  }

  if (
    question.questionType ===
    "DIAGRAM"
  ) {
    return true;
  }

  return isLikelyRealQuestionText(
    questionText
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

  const result:
    ParsedQuestion[] =
    [];

  for (
    const question
    of questions
  ) {
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

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      question
    );
  }

  return result;
};

// ============================================================
// NORMALIZE
// ============================================================

const normalizeQuestions = (
  questions: ParsedQuestion[]
): ParsedQuestion[] => {
  return questions.map(
    (
      question,
      index
    ) => ({
      ...question,

      globalQuestionNumber:
        index + 1,

      questionNumber:
        question.questionNumber,

      subjectQuestionNumber:
        question.subjectQuestionNumber,

      options:
        Array.isArray(
          question.options
        )
          ? question.options
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
        question.imageUrl ||
        "",

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
// QUESTION BLOCK SPLITTER
// ============================================================
//
// THIS IS THE MAIN FIX.
//
// Once a REAL question is opened:
//
// Q25
//
// everything belongs to Q25:
//
// I. ...
// II. ...
// III. ...
// (1) ...
// (2) ...
// (3) ...
// (4) ...
// dates inside PDF
// page headers
// wrapped lines
//
// New block ONLY starts when a NEW REAL QUESTION number
// is found.
//
// ============================================================

const splitQuestionBlocks = (
  text: string
): QuestionBlock[] => {
  const lines =
    normalizePdfText(
      text
    )
      .split("\n")
      .map((line) =>
        String(line || "")
          .trimEnd()
      );

  const result:
    QuestionBlock[] =
    [];

  let currentStart =
    -1;

  let currentNumber:
    | number
    | null = null;

  let answerKeyMode =
    false;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line =
      normalizeLine(
        lines[i]
      );

    if (!line) {
      continue;
    }

    // ========================================================
    // ANSWER KEY
    // ========================================================

    if (
      isAnswerKeyHeading(
        line
      )
    ) {
      if (
        currentStart >= 0
      ) {
        const block =
          lines
            .slice(
              currentStart,
              i
            )
            .join("\n")
            .trim();

        if (
          block &&
          currentNumber !== null
        ) {
          result.push({
            number:
              currentNumber,

            block,

            position:
              currentStart,
          });
        }
      }

      currentStart = -1;
      currentNumber = null;

      answerKeyMode =
        true;

      continue;
    }

    // ========================================================
    // ANSWER KEY MODE
    // ========================================================

    if (
      answerKeyMode
    ) {
      // Stay in answer mode until genuine question starts.
      if (
        isRealQuestionStart(
          line,
          currentNumber
        )
      ) {
        answerKeyMode =
          false;
      } else {
        continue;
      }
    }

    // ========================================================
    // OPTION FIRST
    //
    // This MUST happen before question detection.
    // ========================================================

    if (
      isOptionLine(line)
    ) {
      continue;
    }

    // ========================================================
    // ROMAN STATEMENT
    //
    // I. ...
    // II. ...
    // III. ...
    //
    // NEVER question start.
    // ========================================================

    if (
      isRomanStatement(line)
    ) {
      continue;
    }

    // ========================================================
    // METADATA
    // ========================================================

    if (
      isMetadataLine(line)
    ) {
      continue;
    }

    // ========================================================
    // HEADINGS
    // ========================================================

    if (
      isKnownHeading(line)
    ) {
      continue;
    }

    // ========================================================
    // REAL QUESTION
    // ========================================================

    if (
      isRealQuestionStart(
        line,
        currentNumber
      )
    ) {
      const number =
        getQuestionNumberFromLine(
          line
        );

      if (
        number !== null
      ) {
        // ----------------------------------------------------
        // Finish previous question
        // ----------------------------------------------------

        if (
          currentStart >= 0 &&
          currentNumber !== null
        ) {
          const block =
            lines
              .slice(
                currentStart,
                i
              )
              .join("\n")
              .trim();

          if (
            block
          ) {
            result.push({
              number:
                currentNumber,

              block,

              position:
                currentStart,
            });
          }
        }

        // ----------------------------------------------------
        // Start new question
        // ----------------------------------------------------

        currentStart =
          i;

        currentNumber =
          number;

        console.log(
          "REAL QUESTION START:",
          `Q${number}`,
          "|",
          getQuestionTextAfterNumber(
            line
          )
        );

        continue;
      }
    }

    // ========================================================
    // STANDALONE QUESTION
    // ========================================================

    if (
      currentStart < 0 &&
      isStandaloneQuestionNumber(
        lines,
        i,
        currentNumber
      )
    ) {
      const number =
        getQuestionNumberFromLine(
          line
        );

      if (
        number !== null
      ) {
        currentStart =
          i;

        currentNumber =
          number;

        continue;
      }
    }

    // ========================================================
    // OTHERWISE:
    //
    // DO NOTHING.
    //
    // The line remains logically inside current question.
    // ========================================================
  }

  // ==========================================================
  // FLUSH LAST QUESTION
  // ==========================================================

  if (
    currentStart >= 0 &&
    currentNumber !== null
  ) {
    const block =
      lines
        .slice(
          currentStart
        )
        .join("\n")
        .trim();

    if (
      block
    ) {
      result.push({
        number:
          currentNumber,

        block,

        position:
          currentStart,
      });
    }
  }

  // ==========================================================
  // FINAL SAFETY FILTER
  // ==========================================================

  const filtered =
    result.filter(
      (block) => {

        const blockLines =
          block.block
            .split("\n")
            .map(
              normalizeLine
            )
            .filter(Boolean);

        if (
          !blockLines.length
        ) {
          return false;
        }

        const firstLine =
          blockLines[0];

        const inlineText =
          getQuestionTextAfterNumber(
            firstLine
          );

        // Normal:
        // 25. Which...
        if (
          inlineText &&
          isLikelyRealQuestionText(
            inlineText
          )
        ) {
          return true;
        }

        // Standalone:
        // 25
        // Which...
        if (
          STANDALONE_QUESTION_NUMBER_REGEX.test(
            firstLine
          )
        ) {
          for (
            let i = 1;
            i < blockLines.length;
            i++
          ) {
            const next =
              blockLines[i];

            if (
              isMetadataLine(next)
            ) {
              continue;
            }

            if (
              isKnownHeading(next)
            ) {
              continue;
            }

            return isLikelyRealQuestionText(
              next
            );
          }
        }

        return false;
      }
    );

  console.log(
    "QUESTION BLOCKS AFTER FILTER:",
    filtered.length
  );

  return filtered;
};

// ============================================================
// MAIN PARSER
// ============================================================

export const parseQuestions = (
  rawText: string,
  options?: {
    subject?: string;
    chapter?: string;
    language?: string;
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

  // ==========================================================
  // CONTROLLER VALUES
  // ==========================================================

  const subject =
    options?.subject ||
    "Physics";

  const chapter =
    options?.chapter ??
    options?.defaultChapter ??
    "";

  const language =
    options?.language ||
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
    "SUBJECT FROM CONTROLLER:",
    subject
  );

  console.log(
    "CHAPTER:",
    chapter ||
      "NOT USED"
  );

  console.log(
    "LANGUAGE:",
    language ||
      "NOT DETECTED"
  );

  console.log(
    "=========================================="
  );

  // ==========================================================
  // SPLIT ONLY REAL QUESTIONS
  // ==========================================================

  const blocks =
    splitQuestionBlocks(
      cleanedText
    );

  console.log(
    "RAW QUESTION BLOCKS:",
    blocks.length
  );

  if (
    !blocks.length
  ) {
    console.warn(
      "PDF PARSER: No valid main questions found"
    );

    return [];
  }

  // ==========================================================
  // COUNTERS
  // ==========================================================

  let globalQuestionNumber =
    0;

  let subjectQuestionNumber =
    0;

  // ==========================================================
  // PARSE BLOCKS
  // ==========================================================

  const parsedQuestions =
    blocks.map(
      (item) => {

        globalQuestionNumber++;

        subjectQuestionNumber++;

        const parsed =
          parseSingleQuestion(
            item.number,

            item.block,

            globalQuestionNumber,

            subjectQuestionNumber,

            subject,

            chapter,

            language
          );

        console.log(
          `PDF Q${item.number} → GLOBAL Q${globalQuestionNumber}`,
          "| TYPE:",
          parsed.questionType,
          "| OPTIONS:",
          parsed.options.length
        );

        console.log(
          `Q${item.number} OPTIONS:`,
          parsed.options
        );

        return parsed;
      }
    );

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validQuestions =
    parsedQuestions.filter(
      isUsableQuestion
    );

  console.log(
    "RECOGNIZED QUESTIONS:",
    parsedQuestions.length
  );

  console.log(
    "VALID MAIN QUESTIONS:",
    validQuestions.length
  );

  // ==========================================================
  // INCOMPLETE OPTION DEBUG
  // ==========================================================

  const incompleteQuestions =
    validQuestions.filter(
      (q) =>
        q.questionType ===
          "MCQ" &&
        q.options.length <
          4
    );

  console.log(
    "MCQ WITH < 4 OPTIONS:",
    incompleteQuestions.length
  );

  if (
    incompleteQuestions.length >
    0
  ) {
    console.log(
      "============= OPTION DEBUG ============="
    );

    incompleteQuestions
      .slice(0, 25)
      .forEach(
        (q) => {
          console.log(
            `Q${q.questionNumber}:`,
            q.question
          );

          console.log(
            "OPTIONS:",
            q.options
          );
        }
      );

    console.log(
      "========================================"
    );
  }

  // ==========================================================
  // DEDUPLICATE
  // ==========================================================

  const uniqueQuestions =
    deduplicateQuestions(
      validQuestions
    );

  console.log(
    "UNIQUE QUESTIONS:",
    uniqueQuestions.length
  );

  // ==========================================================
  // NORMALIZE
  // ==========================================================

  const normalized =
    normalizeQuestions(
      uniqueQuestions
    );

  // ==========================================================
  // SUMMARY
  // ==========================================================

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
    "SUBJECT:",
    subject
  );

  console.log(
    "CHAPTER:",
    chapter ||
      "NOT USED"
  );

  console.log(
    "LANGUAGE:",
    language ||
      "NOT DETECTED"
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
  return parseTable(
    text
  );
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
    parseTable(
      text
    );

  return determineQuestionType(
    text,
    table.headers,
    table.rows
  );
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default parseQuestions;