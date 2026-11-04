
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

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

// إعداد Z.ai
const apiKey = process.env.ZAI_API_KEY;
const model = process.env.ZAI_MODEL || "glm-4.6v-flash";

if (!apiKey) {
  console.error("لم يتم العثور على ZAI_API_KEY في ملف .env");
  process.exit(1);
}

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.z.ai/api/paas/v4"
});

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
  console.log(`جاري تحليل الصورة باستخدام Z.ai: ${model}`);

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

  console.log("نجح تحليل الصورة باستخدام Z.ai");

  return result
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

// الصفحة الرئيسية
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "SAWARLY Server",
    provider: "Z.ai",
    model
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

      const hasQuestion = question.length > 0;

      const prompt = hasQuestion
        ? `
أنت المساعد البصري الذكي في تطبيق صورلي SAWARLY.

حلل الصورة وأجب عن سؤال المستخدم بشكل مباشر ودقيق.

قواعد الإجابة:
- استخدم اللغة العربية الواضحة.
- ركز على السؤال ولا تخرج عن الموضوع.
- اقرأ النصوص الظاهرة إذا كانت مرتبطة بالسؤال.
- لا تخترع معلومات غير ظاهرة.
- وضح عدم التأكد عندما تكون الصورة غير واضحة.
- لا تستخدم Markdown أو علامات النجمة.
- اجعل الإجابة مختصرة ومفيدة.

سؤال المستخدم:
${question}
`
        : `
أنت المساعد البصري الذكي في تطبيق صورلي SAWARLY.

المستخدم لم يكتب سؤالاً، لذلك افهم الصورة تلقائياً وقدم له المساعدة المناسبة.

المطلوب:
1. حدد ما يظهر في الصورة.
2. اشرح أهم المعلومات والعناصر الظاهرة.
3. اقرأ النصوص الواضحة إذا كانت موجودة.
4. إذا كانت الصورة تعليمية، اشرح فكرتها ببساطة.
5. إذا كانت لمنتج أو جهاز، وضح ماهيته واستخدامه إذا أمكن تحديده.
6. اذكر أي معلومة مهمة قد تفيد المستخدم.

قواعد الإجابة:
- اكتب بالعربية الواضحة.
- ابدأ بوصف مباشر للصورة.
- اجعل الإجابة مختصرة، في حدود 5 إلى 8 جمل.
- لا تخترع معلومات غير ظاهرة.
- لا تستخدم Markdown أو علامات النجمة.
- إذا لم تستطع تحديد شيء، وضح ذلك.
- لا تطلب من المستخدم كتابة سؤال.
`;

      console.log("بدأ تحليل صورة جديدة...");
      console.log(
        hasQuestion
          ? "نوع التحليل: بناءً على سؤال المستخدم"
          : "نوع التحليل: تلقائي بدون سؤال"
      );

      const analysis = await analyzeImage(
        req.file.buffer.toString("base64"),
        req.file.mimetype,
        prompt
      );

      console.log(
        `اكتمل تحليل الصورة بنجاح. المدة: ${Date.now() - startedAt}ms`
      );

      res.json({
        success: true,
        analysis
      });

    } catch (error) {
      const status = getErrorStatus(error);

      console.error("Z.ai Analysis error:", error);
      console.error(
        `فشل التحليل بعد ${Date.now() - startedAt}ms`
      );

      if (status === 429 || status === 503) {
        res.status(503).json({
          error: "خدمة تحليل الصور مشغولة حالياً. حاول مرة أخرى بعد قليل."
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

// معالجة أخطاء رفع الملفات والطلبات
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Request error:", error);

    res.status(400).json({
      error: error.message || "طلب غير صالح"
    });
  }
);

// تشغيل السيرفر
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SAWARLY Server running on port ${PORT}`);
  console.log("AI Provider: Z.ai");
  console.log(`AI Model: ${model}`);
});
