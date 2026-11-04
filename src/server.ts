
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.use("/api/", apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(new Error("نوع الصورة غير مدعوم"));
      return;
    }

    callback(null, true);
  }
});

const model = process.env.ZAI_MODEL || "glm-4.6v-flash";

function getAIClient(): OpenAI {
  const apiKey = process.env.ZAI_API_KEY;

  if (!apiKey) {
    throw new Error("ZAI_API_KEY_MISSING");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4"
  });
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    return Number((error as { status: unknown }).status);
  }

  return undefined;
}

async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const ai = getAIClient();

  const response = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  const content = response.choices[0]?.message?.content;

  let result = "";

  if (typeof content === "string") {
    result = content;
  } else if (Array.isArray(content)) {
    result = content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
  }

  if (!result.trim()) {
    throw new Error("الموديل لم يرجع نتيجة");
  }

  return result
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

// اختبار حالة السيرفر
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    app: "SAWARLY Server",
    provider: "Z.ai",
    model,
    environment: process.env.NODE_ENV || "development"
  });
});

// فحص جاهزية مفتاح الذكاء الاصطناعي بدون كشفه
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(process.env.ZAI_API_KEY)
  });
});

// تحليل الصور
app.post(
  "/api/analyze",
  upload.single("image"),
  async (req, res) => {
    const startedAt = Date.now();

    try {
      if (!req.file) {
        res.status(400).json({
          error: "لم يتم إرسال صورة"
        });
        return;
      }

      const question =
        typeof req.body.question === "string"
          ? req.body.question.trim()
          : "";

      const prompt = question
        ? `
أنت المساعد البصري الذكي في تطبيق صورلي SAWARLY.

حلل الصورة وأجب عن سؤال المستخدم بشكل مباشر ودقيق.

قواعد الإجابة:
- استخدم اللغة العربية الواضحة.
- ركز على السؤال.
- اقرأ النصوص الظاهرة إذا كانت مرتبطة بالسؤال.
- لا تخترع معلومات غير ظاهرة.
- وضح عدم التأكد عندما تكون الصورة غير واضحة.
- لا تستخدم Markdown أو علامات النجمة.

سؤال المستخدم:
${question}
`
        : `
أنت المساعد البصري الذكي في تطبيق صورلي SAWARLY.

حلل الصورة تلقائياً وقدم المساعدة المناسبة.

المطلوب:
1. حدد ما يظهر في الصورة.
2. اشرح أهم المعلومات والعناصر الظاهرة.
3. اقرأ النصوص الواضحة إن وجدت.
4. إذا كانت تعليمية، اشرح فكرتها ببساطة.
5. إذا كانت لمنتج أو جهاز، وضح ماهيته واستخدامه إذا أمكن.
6. لا تخترع معلومات غير ظاهرة.

اكتب بالعربية الواضحة في 5 إلى 8 جمل.
لا تستخدم Markdown أو علامات النجمة.
`;

      const analysis = await analyzeImage(
        req.file.buffer.toString("base64"),
        req.file.mimetype,
        prompt
      );

      console.log(
        `Analysis completed in ${Date.now() - startedAt}ms`
      );

      res.status(200).json({
        success: true,
        analysis
      });

    } catch (error) {
      console.error("Analysis error:", error);

      if (
        error instanceof Error &&
        error.message === "ZAI_API_KEY_MISSING"
      ) {
        res.status(503).json({
          error: "خدمة الذكاء الاصطناعي غير مُعدّة حالياً."
        });
        return;
      }

      const status = getErrorStatus(error);

      if (status === 429 || status === 503) {
        res.status(503).json({
          error: "خدمة تحليل الصور مشغولة حالياً. حاول لاحقاً."
        });
        return;
      }

      if (status === 401 || status === 403) {
        res.status(502).json({
          error: "مشكلة في صلاحية الاتصال بخدمة الذكاء الاصطناعي."
        });
        return;
      }

      res.status(500).json({
        error: "حصلت مشكلة أثناء تحليل الصورة. حاول مرة أخرى."
      });
    }
  }
);

// معالجة المسارات غير الموجودة
app.use((_req, res) => {
  res.status(404).json({
    error: "المسار المطلوب غير موجود",
    app: "SAWARLY Server"
  });
});

// معالجة أخطاء رفع الملفات والطلبات
app.use((
  error: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error("Request error:", error);

  res.status(400).json({
    error: error.message || "طلب غير صالح"
  });
});

export default app;

// تشغيل محلي فقط، وVercel يتولى تشغيل التطبيق في الإنتاج
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAWARLY Server running on port ${PORT}`);
    console.log(`AI Model: ${model}`);
  });
}
