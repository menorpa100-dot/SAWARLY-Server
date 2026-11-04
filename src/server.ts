
async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const ai = getAIClient();

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
  const result = typeof content === "string" ? content : "";

  if (!result.trim()) {
    throw new Error("الموديل لم يرجع نتيجة");
  }

  console.log("نجح تحليل الصورة باستخدام Z.ai");

  return result
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}
