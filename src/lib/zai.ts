/**
 * zai.ts — the single place where the app resolves its LLM connection.
 *
 * The z-ai-web-dev-sdk normally discovers credentials by reading a
 * `.z-ai-config` JSON file from (in order) the project directory, the home
 * directory, or /etc. That works for local development, but NOT on
 * serverless hosts like Vercel: the deployment filesystem is read-only and
 * no credential file ships with a public repository.
 *
 * So the same values can arrive as environment variables, and we build the
 * SDK client from them directly:
 *
 *   ZAI_BASE_URL  required — OpenAI-compatible base URL (…/v1)
 *   ZAI_API_KEY   required — sent as the Bearer key
 *   ZAI_TOKEN     optional — sent as the X-Token header (gateway sessions)
 *   ZAI_CHAT_ID   optional — sent as the X-Chat-Id header
 *   ZAI_USER_ID   optional — sent as the X-User-Id header
 *   ZAI_MODEL     optional — model name for providers that require one
 *
 * Precedence: env vars first, then the SDK's file discovery (ZAI.create()).
 * Returns null when neither is available — callers decide how to degrade
 * (the chat answers "not configured", content generation is skipped).
 */
import ZAI, { type ZAIConfig } from 'z-ai-web-dev-sdk';

export type ZaiClient = InstanceType<typeof ZAI>;

let cached: ZaiClient | null = null;

/** Read ZAI_* environment variables into a SDK config, or null. */
function envConfig(): {
  baseUrl: string;
  apiKey: string;
  token?: string;
  chatId?: string;
  userId?: string;
} | null {
  const baseUrl = process.env.ZAI_BASE_URL?.trim();
  const apiKey = process.env.ZAI_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;

  const config: { baseUrl: string; apiKey: string; token?: string; chatId?: string; userId?: string } = {
    baseUrl,
    apiKey,
  };
  const token = process.env.ZAI_TOKEN?.trim();
  const chatId = process.env.ZAI_CHAT_ID?.trim();
  const userId = process.env.ZAI_USER_ID?.trim();
  if (token) config.token = token;
  if (chatId) config.chatId = chatId;
  if (userId) config.userId = userId;
  return config;
}

/**
 * Get the shared LLM client, or null when no credentials exist.
 * Successful instances are cached for the lifetime of the process.
 */
export async function getZai(): Promise<ZaiClient | null> {
  if (cached) return cached;

  const fromEnv = envConfig();
  if (fromEnv) {
    // The SDK declares a private constructor in its typings but it is a
    // plain public class at runtime — building the client directly is how
    // we support env-based credentials where no config file exists.
    const Ctor = ZAI as unknown as new (config: ZAIConfig) => ZaiClient;
    cached = new Ctor(fromEnv);
    return cached;
  }

  try {
    cached = await ZAI.create();
    return cached;
  } catch (err) {
    console.error(
      '[lib/zai] no LLM credentials: set ZAI_BASE_URL/ZAI_API_KEY or provide a .z-ai-config file —',
      (err as Error).message,
    );
    return null;
  }
}

/**
 * Optional model name (ZAI_MODEL) forwarded in each completion request.
 * The z.ai gateway picks its default when unset; most third-party
 * OpenAI-compatible providers require this to be set.
 */
export function zaiModel(): string | undefined {
  return process.env.ZAI_MODEL?.trim() || undefined;
}
