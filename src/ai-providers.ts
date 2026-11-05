
export type AIProvider = {
  id: "zai" | "groq" | "gemini" | "cohere" | "openrouter";
  name: string;
  kind: "openai" | "gemini" | "cohere";
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel?: string;
  baseURL: string;
  enabled: boolean;
  supportsVision: boolean;
  freeOnly: true;
  freeConfirmed: boolean;
  privacyApproved: boolean;
};

function provider(
  id: AIProvider["id"],
  name: string,
  kind: AIProvider["kind"],
  apiKeyEnv: string,
  modelEnv: string,
  baseURL: string,
  defaultModel?: string
): AIProvider {
  const prefix = id.toUpperCase();

  return {
    id,
    name,
    kind,
    apiKeyEnv,
    modelEnv,
    baseURL,
    defaultModel,
    enabled: process.env[`${prefix}_ENABLED`] === "true",
    supportsVision: true,
    freeOnly: true,
    freeConfirmed: process.env[`${prefix}_FREE_CONFIRMED`] === "true",
    privacyApproved:
      process.env[`${prefix}_PRIVACY_APPROVED`] === "true"
  };
}

export const AI_PROVIDERS: AIProvider[] = [
  provider(
    "zai",
    "Z.ai",
    "openai",
    "ZAI_API_KEY",
    "ZAI_MODEL",
    "https://api.z.ai/api/paas/v4",
    "glm-4.6v-flash"
  ),
  provider(
    "groq",
    "Groq",
    "openai",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "https://api.groq.com/openai/v1",
    "qwen/qwen3.8-27b"
  ),
  provider(
    "gemini",
    "Gemini",
    "gemini",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "https://generativelanguage.googleapis.com/v1beta"
  ),
  provider(
    "cohere",
    "Cohere",
    "cohere",
    "COHERE_API_KEY",
    "COHERE_MODEL",
    "https://api.cohere.com/v2",
    "command-a-vision-07-2025"
  ),
  provider(
    "openrouter",
    "OpenRouter",
    "openai",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "https://openrouter.ai/api/v1"
  )
];
