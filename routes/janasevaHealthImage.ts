import { Router, Request, Response } from "express";
import JanasevaUser from "../models/JanasevaUser";
import {
  janasevaAuth,
  JanasevaRequest,
} from "../middleware/janasevaAuth";

const router = Router();

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  "qwen/qwen3.8-27b";

/*
 * This endpoint accepts:
 *
 * {
 *   "message": "Ee image lo unna medicine label ni explain cheyyi",
 *   "language": "Telugu",
 *   "imageBase64": "data:image/jpeg;base64,..."
 * }
 *
 * OR:
 *
 * {
 *   "message": "Ee image ni explain cheyyi",
 *   "language": "Telugu",
 *   "imageUrl": "https://..."
 * }
 *
 * Name is NEVER taken from req.body.
 * Name comes from JWT userId -> MongoDB.
 */

router.post(
  "/janaseva/health-image",
  janasevaAuth,
  async (
    req: JanasevaRequest,
    res: Response,
  ): Promise<void> => {
    try {
      // =========================================================
      // 1. GET LOGGED-IN USER ID
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
      // 2. GET USER MESSAGE
      // =========================================================

      const message = String(
        req.body?.message ?? "",
      ).trim();

      // Image question is optional.
      // If empty, give a default instruction.
      const userQuestion =
        message ||
        "ఈ చిత్రంలో కనిపిస్తున్న ఆరోగ్య సంబంధిత సమాచారాన్ని సులభంగా వివరించండి.";

      // =========================================================
      // 3. GET IMAGE
      // =========================================================

      const imageUrl = String(
        req.body?.imageUrl ?? "",
      ).trim();

      const imageBase64 = String(
        req.body?.imageBase64 ?? "",
      ).trim();

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message:
            "Please upload a health-related image.",
        });

        return;
      }

      // Do not accept both unnecessarily.
      if (imageUrl && imageBase64) {
        res.status(400).json({
          success: false,
          message:
            "Please send either imageUrl or imageBase64, not both.",
        });

        return;
      }

      // =========================================================
      // 4. GET USER FROM MONGODB
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
      // 5. ACCOUNT CHECK
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
      // 6. USER NAME FROM DATABASE
      // =========================================================

      const userName =
        user.name &&
        user.name.trim().length > 0
          ? user.name.trim()
          : "User";

      // =========================================================
      // 7. RESPONSE LANGUAGE
      // =========================================================

      const requestedLanguage =
        String(
          req.body?.language ?? "",
        )
          .trim()
          .toLowerCase();

      const language =
        requestedLanguage === "english"
          ? "English"
          : "Telugu";

      // =========================================================
      // 8. GROQ API KEY
      // =========================================================

      const apiKey =
        process.env.GROQ_API_KEY;

      if (!apiKey) {
        console.error(
          "❌ GROQ_API_KEY is missing.",
        );

        res.status(500).json({
          success: false,
          message:
            "Health assistant configuration is missing.",
        });

        return;
      }

      // =========================================================
      // 9. BUILD IMAGE CONTENT
      // =========================================================

      let groqImageUrl = "";

      if (imageUrl) {
        /*
         * Remote image URL.
         */
        groqImageUrl = imageUrl;
      } else {
        /*
         * Base64 image from Flutter.
         *
         * We support:
         *
         * data:image/jpeg;base64,...
         * data:image/png;base64,...
         * data:image/webp;base64,...
         *
         * If Flutter sends plain base64, JPEG is assumed.
         */

        if (
          imageBase64.startsWith(
            "data:image/",
          )
        ) {
          groqImageUrl = imageBase64;
        } else {
          groqImageUrl =
            `data:image/jpeg;base64,${imageBase64}`;
        }
      }

      // =========================================================
      // 10. BASIC IMAGE VALIDATION
      // =========================================================

      if (
        !groqImageUrl.startsWith(
          "http://",
        ) &&
        !groqImageUrl.startsWith(
          "https://",
        ) &&
        !groqImageUrl.startsWith(
          "data:image/",
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid image format.",
        });

        return;
      }

      // =========================================================
      // 11. SYSTEM PROMPT
      // =========================================================

      const systemPrompt = `
You are the Janaseva Health Image Assistant.

Your job is to understand the CURRENT image and the user's CURRENT question.

Do not change the topic.

==================================================
USER
==================================================

User name:
${userName}

Required response language:
${language}

==================================================
LANGUAGE
==================================================

When required language is Telugu:
- Answer completely in Telugu script.
- Use simple everyday Telugu.
- Do not unnecessarily mix English.

When required language is English:
- Answer completely in English.

==================================================
NAME
==================================================

Use the user's name naturally once.

Example:
"${userName}, ..."

Do not repeat the name.

Do not ask for the name.

==================================================
IMAGE ANALYSIS
==================================================

Analyze only what is actually visible in the image.

Do not invent information.

If text is visible:
- read the visible text carefully
- explain what is visible

If a medicine package or medicine strip is visible:
- identify the medicine name only when clearly readable
- explain the visible label information and likely general purpose
- do NOT prescribe the medicine
- do NOT tell the user to take it
- do NOT provide dosage instructions from image alone
- do NOT assume the medicine is suitable for the user

If a prescription is visible:
- explain what is clearly readable
- do not independently prescribe or alter the prescription

If a laboratory report is visible:
- explain visible values in simple language
- do not provide a definite diagnosis

If a skin/body image is provided:
- describe visible features cautiously
- do not claim a definite disease diagnosis from an image alone

==================================================
CURRENT QUESTION
==================================================

Answer ONLY the user's current question about the image.

Current user question:
${userQuestion}

Do not add unrelated health information.

Do not discuss unrelated medical topics.

Do not create unnecessary warnings.

==================================================
MEDICAL SAFETY
==================================================

Provide general health information only.

Do not claim a definite diagnosis.

Do not pretend to be a doctor.

Do not prescribe medicines.

Do not give unsafe medication instructions.

Do not tell the user to start or stop a medicine solely from an image.

Do not unnecessarily frighten the user.

Recommend professional medical care only when relevant.

==================================================
IMAGE UNCERTAINTY
==================================================

If the image is blurry, dark, cropped, or unreadable:

- clearly say what cannot be read
- ask the user to upload a clearer image
- do not guess the missing information

==================================================
OUTPUT
==================================================

Be concise and useful.

Return only the final answer.

Do not mention:
- Groq
- GPT
- model
- system prompt
- policies
- internal reasoning

Required response language:
${language}
`;

      // =========================================================
      // 12. GROQ REQUEST
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
              model:
                GROQ_VISION_MODEL,

              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt,
                },

                {
                  role: "user",

                  content: [
                    {
                      type: "text",
                      text:
                        userQuestion,
                    },

                    {
                      type: "image_url",

                      image_url: {
                        url:
                          groqImageUrl,
                      },
                    },
                  ],
                },
              ],

              stream: false,

              /*
               * Qwen 3.8 27B instruct mode.
               * Fast general conversation.
               */
              reasoning_effort:
                "none",

              reasoning_format:
                "hidden",

              temperature:
                0.7,

              top_p:
                0.8,

              max_completion_tokens:
                700,
            }),
          },
        );

      // =========================================================
      // 13. READ GROQ RESPONSE
      // =========================================================

      const groqData =
        await groqResponse.json();

      // =========================================================
      // 14. GROQ ERROR
      // =========================================================

      if (!groqResponse.ok) {
        console.error(
          "❌ GROQ IMAGE STATUS:",
          groqResponse.status,
        );

        console.error(
          "❌ GROQ IMAGE STATUS TEXT:",
          groqResponse.statusText,
        );

        console.error(
          "❌ GROQ IMAGE ERROR:",
          JSON.stringify(
            groqData,
            null,
            2,
          ),
        );

        res.status(502).json({
          success: false,
          message:
            "Image health assistant is temporarily unavailable.",
        });

        return;
      }

      // =========================================================
      // 15. GET ANSWER
      // =========================================================

      const rawAnswer =
        groqData?.choices?.[0]
          ?.message?.content;

      const finalAnswer =
        typeof rawAnswer ===
        "string"
          ? rawAnswer.trim()
          : "";

      // =========================================================
      // 16. EMPTY RESPONSE
      // =========================================================

      if (!finalAnswer) {
        console.error(
          "❌ GROQ IMAGE RETURNED EMPTY ANSWER:",
          JSON.stringify(
            groqData,
            null,
            2,
          ),
        );

        res.status(502).json({
          success: false,
          message:
            "Image health assistant returned an empty response.",
        });

        return;
      }

      // =========================================================
      // 17. RESPONSE
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

        model:
          GROQ_VISION_MODEL,
      });
    } catch (error: unknown) {
      // =========================================================
      // 18. SERVER ERROR
      // =========================================================

      console.error(
        "❌ JANASEVA HEALTH IMAGE ERROR:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Image health assistant is temporarily unavailable.",
      });
    }
  },
);

export default router;