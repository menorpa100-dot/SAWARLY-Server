
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();

// التطبيق يعمل خلف Vercel Proxy
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const model = process.env.ZAI_MODEL || "glm-4.6v-flash";

app.disable("x-powered-by");
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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
      callback(new Error("نوع الصورة غير مدعوم"));
      return;
    }

    callback(null, true);
  }
});

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
  if (typeof error === "object" && error !== null && "status" in error) {
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
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`
          }
        }
      ]
    }],
    max_tokens: 1000
  });

  const content = response.choices[0]?.message?.content;
  const result = typeof content === "string" ? content : "";

  if (!result.trim()) {
    throw new Error("الموديل لم يرجع نتيجة");
  }

  return result.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

// اختبار السيرفر
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "SAWARLY Server",
    provider: "Z.ai",
    model
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(process.env.ZAI_API_KEY)
  });
});

// تحليل الصور
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  const startedAt = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم إرسال صورة" });
      return;
    }

    const question =
      typeof req.body.question === "string"
        ? req.body.question.trim()
        : "";

    const prompt = question
      ? `أنت المساعد البصري في تطبيق SAWARLY. حلل الصورة وأجب عن السؤال التالي بالعربية بوضوح ودقة. لا تخترع معلومات غير ظاهرة، ووضح عدم التأكد عند الحاجة. لا تستخدم Markdown.\n\nسؤال المستخدم: ${question}`
      : `أنت المساعد البصري في تطبيق SAWARLY. صف الصورة واشرح أهم العناصر والنصوص الظاهرة بالعربية في 5 إلى 8 جمل. لا تخترع معلومات غير ظاهرة ولا تستخدم Markdown.`;

    const analysis = await analyzeImage(
      req.file.buffer.toString("base64"),
      req.file.mimetype,
      prompt
    );

    console.log(`Analysis completed in ${Date.now() - startedAt}ms`);

    res.json({
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
      error: "حصلت مشكلة أثناء تحليل الصورة."
    });
  }
});

// المسارات غير الموجودة
app.use((_req, res) => {
  res.status(404).json({
    error: "المسار غير موجود",
    app: "SAWARLY Server"
  });
});

// معالجة أخطاء الملفات
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

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAWARLY Server running on port ${PORT}`);
  });
}
