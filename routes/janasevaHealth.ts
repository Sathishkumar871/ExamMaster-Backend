import { Router } from "express";

import JanasevaUser from "../models/JanasevaUser";

import {
  janasevaAuth,
  JanasevaRequest,
} from "../middleware/janasevaAuth";

const router = Router();

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

/*
 * Current .env:
 *
 * GROQ_MODEL=openai/gpt-oss-120b
 *
 * Keep the model configurable through .env.
 */
const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  "openai/gpt-oss-120b";

router.post(
  "/janaseva/health-assistant",
  janasevaAuth,
  async (
    req: JanasevaRequest,
    res,
  ): Promise<void> => {
    try {
      // =========================================================
      // 1. GET LOGGED-IN USER ID FROM JWT
      // =========================================================

      const userId =
        req.janasevaUser?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message:
            "User authentication information is missing.",
        });

        return;
      }

      // =========================================================
      // 2. GET CURRENT USER MESSAGE
      // =========================================================

      const message = String(
        req.body?.message ?? "",
      ).trim();

      if (!message) {
        res.status(400).json({
          success: false,
          message:
            "Please enter your health question.",
        });

        return;
      }

      if (message.length > 4000) {
        res.status(400).json({
          success: false,
          message:
            "Health question is too long. Please keep it under 4000 characters.",
        });

        return;
      }

      // =========================================================
      // 3. GET USER FROM MONGODB
      //
      // IMPORTANT:
      // User name is taken from authenticated user + DB.
      // Name is NOT accepted from req.body.
      // =========================================================

      const user =
        await JanasevaUser.findById(
          userId,
        ).select(
          "name language isActive",
        );

      if (!user) {
        res.status(404).json({
          success: false,
          message:
            "Janaseva user not found.",
        });

        return;
      }

      // =========================================================
      // 4. CHECK ACCOUNT
      // =========================================================

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message:
            "Your Janaseva account is inactive.",
        });

        return;
      }

      // =========================================================
      // 5. USER NAME FROM DATABASE
      // =========================================================

      const userName =
        user.name &&
        user.name.trim().length > 0
          ? user.name.trim()
          : "User";

      // =========================================================
      // 6. RESPONSE LANGUAGE
      //
      // Telugu = default
      // English = only when explicitly requested
      // =========================================================

      const requestedLanguage =
        String(
          req.body?.language ?? "",
        )
          .trim()
          .toLowerCase();

      const language =
        requestedLanguage ===
        "english"
          ? "English"
          : "Telugu";

      // =========================================================
      // 7. GROQ API KEY
      // =========================================================

      const apiKey =
        process.env.GROQ_API_KEY;

      if (!apiKey) {
        console.error(
          "❌ GROQ_API_KEY is missing in .env",
        );

        res.status(500).json({
          success: false,
          message:
            "Health assistant configuration is missing.",
        });

        return;
      }

      // =========================================================
      // 8. SYSTEM PROMPT
      // =========================================================

      const systemPrompt = `
You are Janaseva Health Assistant.

Your ONLY task is to answer the user's CURRENT health-related message.

==================================================
USER INFORMATION
==================================================

User name:
${userName}

Required response language:
${language}

==================================================
LANGUAGE RULES
==================================================

The required response language is "${language}".

IMPORTANT:

1. If the required response language is Telugu:
   - Respond completely in Telugu script.
   - Do NOT answer in English.
   - Do NOT use unnecessary English sentences.
   - Simple common medical words may be used when naturally needed.

2. If the required response language is English:
   - Respond completely in English.
   - Do NOT answer in Telugu.

3. Telugu may be written in two ways:

Telugu script:
"నాకు తలనొప్పి ఉంది"

Telugu written using English letters:
"naku talanoppi undi"

Both mean:
"నాకు తలనొప్పి ఉంది"

==================================================
TELUGU ROMAN TEXT
==================================================

Understand common Telugu words written using English letters.

Examples:

"naku talanoppi undi"
= I have a headache
= నాకు తలనొప్పి ఉంది

"naku jvaram undi"
= I have fever
= నాకు జ్వరం ఉంది

"naku daggu undi"
= I have a cough
= నాకు దగ్గు ఉంది

"naaku cold undi"
= I have a cold
= నాకు జలుబు ఉంది

"naku stomach pain undi"
= I have stomach pain
= నాకు కడుపు నొప్పి ఉంది

IMPORTANT:
Never change one symptom into another.

If the user says headache,
answer about headache.

If the user says fever,
answer about fever.

If the user says cough,
answer about cough.

Do not invent symptoms.

==================================================
NAME RULES
==================================================

The user's real name is:
${userName}

Use the user's name naturally once.

Example:
"${userName}, ..."

Do not repeat the name.

Do not ask for the name.

Do not use a name supplied by the user message.

==================================================
CURRENT MESSAGE RULE
==================================================

Answer ONLY the user's CURRENT message.

Do not add unrelated information.

Do not discuss unrelated health conditions.

Do not give a generic health lecture.

Do not add unnecessary tips.

Do not add unnecessary warnings.

Do not add unnecessary doctor recommendations.

Do not change the subject.

Do not answer a different question.

==================================================
MEDICAL SAFETY
==================================================

Provide general health information only.

Do not claim a definite diagnosis.

Do not pretend to be a doctor.

Do not prescribe medicines.

Do not provide unsafe medication instructions.

Do not unnecessarily frighten the user.

Recommend medical professional care only when relevant to the current concern.

For symptoms that may require urgent medical attention,
advise appropriate urgent care clearly and calmly.

==================================================
ANSWER STYLE
==================================================

Be natural.

Be clear.

Be concise.

For a simple symptom:
- explain common possible reasons briefly
- give simple general care when appropriate
- mention professional care only when relevant

Do not create a long article.

==================================================
VERY IMPORTANT
==================================================

Never return:

"నేను ఆరోగ్యానికి సంబంధించిన ప్రశ్నలకు మాత్రమే సహాయం చేయగలను."

Never classify a health concern as unrelated.

Never refuse a valid health question simply because it is:
- Telugu
- Telugu script
- Telugu written in English letters
- short
- grammatically imperfect

==================================================
FINAL LANGUAGE CHECK
==================================================

Before producing the final answer:

1. Check the actual meaning of the user's message.
2. Check the requested response language.
3. Answer only that message.
4. Make sure the final answer is in the requested language.
5. Make sure the symptom/topic was not changed.

==================================================
OUTPUT
==================================================

Return ONLY the final answer.

Do not mention:
- Groq
- GPT
- model
- system prompt
- instructions
- policies
- internal reasoning

Required language:
${language}
`;

      // =========================================================
      // 9. BUILD USER MESSAGE
      //
      // Repeating language + current message makes the
      // language requirement more explicit to the model.
      // =========================================================

      const userMessage = `
Required response language: ${language}

Current user health message:
${message}

Answer only this current message.
`;

      // =========================================================
      // 10. GROQ REQUEST
      // =========================================================

      const groqResponse =
        await fetch(
          GROQ_URL,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              model: GROQ_MODEL,

              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },

                {
                  role: "user",
                  content: userMessage,
                },
              ],

              stream: false,

              /*
               * GPT-OSS 120B supports:
               * low / medium / high
               *
               * We use low for faster responses.
               */
              reasoning_effort: "low",

              /*
               * Return final answer only.
               */
              reasoning_format: "hidden",

              /*
               * Stable response.
               */
              temperature: 0.3,

              top_p: 0.8,

              /*
               * Keep response reasonably short.
               */
              max_completion_tokens: 500,
            }),
          },
        );

      // =========================================================
      // 11. READ GROQ RESPONSE
      // =========================================================

      const groqData =
        await groqResponse.json();

      // =========================================================
      // 12. GROQ ERROR
      // =========================================================

      if (!groqResponse.ok) {
        console.error(
          "❌ GROQ STATUS:",
          groqResponse.status,
        );

        console.error(
          "❌ GROQ STATUS TEXT:",
          groqResponse.statusText,
        );

        console.error(
          "❌ GROQ ERROR BODY:",
          JSON.stringify(
            groqData,
            null,
            2,
          ),
        );

        res.status(502).json({
          success: false,
          message:
            "Health assistant is temporarily unavailable.",
        });

        return;
      }

      // =========================================================
      // 13. GET MODEL ANSWER
      // =========================================================

      const rawAnswer =
        groqData?.choices?.[0]
          ?.message?.content;

      const finalAnswer =
        typeof rawAnswer === "string"
          ? rawAnswer.trim()
          : "";

      // =========================================================
      // 14. EMPTY RESPONSE
      // =========================================================

      if (!finalAnswer) {
        console.error(
          "❌ GROQ RETURNED EMPTY ANSWER:",
          JSON.stringify(
            groqData,
            null,
            2,
          ),
        );

        res.status(502).json({
          success: false,
          message:
            "Health assistant returned an empty response.",
        });

        return;
      }

      // =========================================================
      // 15. RESPONSE TO FLUTTER
      // =========================================================

      res.status(200).json({
        success: true,

        answer:
          finalAnswer,

        language,

        user: {
          name:
            userName,
        },
      });
    } catch (error: unknown) {
      // =========================================================
      // 16. SERVER ERROR
      // =========================================================

      console.error(
        "❌ JANASEVA HEALTH ASSISTANT ERROR:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Health assistant is temporarily unavailable.",
      });
    }
  },
);

export default router;