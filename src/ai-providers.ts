
export type AIProvider = {
  name: string;
  enabled: boolean;
  supportsVision: boolean;
  freeOnly: true;
  privacyApproved: boolean;
  apiKeyEnv: string;
  baseURL: string;
  model: string;
};

// لا يتم تفعيل أي مزوّد للصور الخاصة
// إلا بعد التحقق من سياسة الخصوصية وشروط الاستخدام.

export const AI_PROVIDERS: AIProvider[] = [
  {
    name: "Groq",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "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",
    baseURL: "https://api.groq.com/openai/v1",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Gemini",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "AQ.Ab8RN6Jrlq5p5-2nHuiYHlXIImyKmH0gG8-nGnHI725XhAkHTw",
    baseURL: "GEMINI_ENDPOINT_TO_CONFIGURE",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Cohere",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "cohere_MDk7xPeOJ5GOq0o4Y25TCGWsx2uSwrGQfEJxnZPt0tzQxz",
    baseURL: "https://api.cohere.com/v2",
    model: "command-a-vision-07-2025"
  },
  {
    name: "OpenRouter",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "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",
    baseURL: "https://openrouter.ai/api/v1",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Z.ai",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "fb6f1107a37f4367a1e291fc0742b8a6",
    baseURL: "https://api.z.ai/api/paas/v4",
    model: "glm-4.6v-flash"
  }
];
