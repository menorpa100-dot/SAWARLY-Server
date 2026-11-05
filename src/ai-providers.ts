
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
    apiKeyEnv: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Gemini",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "GEMINI_API_KEY",
    baseURL: "GEMINI_ENDPOINT_TO_CONFIGURE",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Mistral",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "MISTRAL_API_KEY",
    baseURL: "https://api.mistral.ai/v1",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "OpenRouter",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    model: "MODEL_TO_VERIFY"
  },
  {
    name: "Z.ai",
    enabled: false,
    supportsVision: true,
    freeOnly: true,
    privacyApproved: false,
    apiKeyEnv: "ZAI_API_KEY",
    baseURL: "https://api.z.ai/api/paas/v4",
    model: "glm-4.6v-flash"
  }
];
