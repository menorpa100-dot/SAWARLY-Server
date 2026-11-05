
export type AIProvider = {
  name: string;
  kind: "openai" | "gemini" | "cohere";
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel?: string;
  baseURL: string;
  enabled: boolean;
  supportsVision: boolean;
  freeOnly: boolean;
  privacyApproved: boolean;
};

function provider(
  name: string,
  kind: AIProvider["kind"],
  apiKeyEnv: string,
  modelEnv: string,
  baseURL: string,
  defaultModel?: string
): AIProvider {
  return {
    name,
    kind,
    apiKeyEnv,
    modelEnv,
    baseURL,
    defaultModel,
    enabled: true,
    supportsVision: true,
    freeOnly:
      process.env[`${name.toUpperCase().replace(/[^A-Z]/g, "")}_FREE_ONLY`] === "true",
    privacyApproved:
      process.env[`${name.toUpperCase().replace(/[^A-Z]/g, "")}_PRIVACY_APPROVED`] === "true"
  };
}

export const AI_PROVIDERS: AIProvider[] = [
  provider(
    "Z.ai",
    "openai",
    "ZAI_API_KEY",
    "ZAI_MODEL",
    "https://api.z.ai/api/paas/v4",
    "glm-4.6v-flash"
  ),
  provider(
    "Groq",
    "openai",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "https://api.groq.com/openai/v1"
  ),
  provider(
    "Gemini",
    "gemini",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "https://generativelanguage.googleapis.com/v1beta/models"
  ),
  provider(
    "Cohere",
    "cohere",
    "COHERE_API_KEY",
    "COHERE_MODEL",
    "https://api.cohere.com/v2",
    "command-a-vision-07-2025"
  ),
  provider(
    "OpenRouter",
    "openai",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "https://openrouter.ai/api/v1"
  )
];
