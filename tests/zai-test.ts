
import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.ZAI_API_KEY;
const model = process.env.ZAI_MODEL || "glm-4.6v-flash";

async function testZAI() {
  if (!apiKey) {
    throw new Error("ZAI_API_KEY مش موجود في ملف .env");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });

  console.log("جاري الاتصال بـ Z.ai...");
  console.log("الموديل:", model);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: "رد باللغة العربية: هل أنت جاهز لتحليل الصور في تطبيق SAWARLY؟",
      },
    ],
  });

  console.log("\nنجح الاتصال!");
  console.log("رد الموديل:");
  console.log(response.choices[0]?.message?.content);
}

testZAI().catch((error: any) => {
  console.error("\nفشل الاختبار:");

  if (error.status) {
    console.error("HTTP Status:", error.status);
  }

  console.error(error.message);
});
