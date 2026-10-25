/**
 * zai.ts — the single place where the app resolves its LLM connection.
 *
 * Two kinds of providers are supported:
 *
 * 1. The z.ai gateway (sandbox / local dev): the z-ai-web-dev-sdk discovers
 *    a `.z-ai-config` JSON file from the project directory, the home
 *    directory, or /etc. That works for local development, but NOT on
 *    serverless hosts like Vercel: the deployment filesystem is read-only
 *    and no credential file ships with a public repository.
 *
 * 2. Any OpenAI-compatible provider configured through environment
 *    variables (Groq, Cerebras, OpenRouter, Together, ...):
 *
 *      ZAI_BASE_URL  required — OpenAI-compatible base URL (…/v1)
 *      ZAI_API_KEY   required — sent as the Bearer key
 *      ZAI_MODEL     required for most third-party providers
 *                       (e.g. Groq: llama-3.3-70b-versatile)
 *      ZAI_TOKEN     optional — sent as the X-Token header (gateway sessions)
 *      ZAI_CHAT_ID   optional — sent as the X-Chat-Id header
 *      ZAI_USER_ID   optional — sent as the X-User-Id header
 *
 *    The z.ai SDK always injects a gateway-specific `thinking` parameter
 *    into every request body. Third-party providers (Groq included) reject
 *    unknown parameters with HTTP 400, which made every chat answer fail.
 *    So when the base URL points at anything other than the z.ai gateway
 *    we bypass the SDK entirely and speak plain OpenAI-compatible JSON.
 *
 * Precedence: env vars first, then the SDK's file discovery (ZAI.create()).
 * Returns null when neither is available — callers decide how to degrade
 * (the chat answers "not configured", content generation is skipped).
 */
import ZAI, { type ZAIConfig } from 'z-ai-web-dev-sdk';

export type ZaiClient = InstanceType<typeof ZAI>;

export interface ZaiEnvConfig {
  baseUrl: string;
  apiKey: string;
  token?: string;
  chatId?: string;
  userId?: string;
}

interface ChatCompletionArgs {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  // Gateway-only extras (ignored by the OpenAI-compatible client).
  thinking?: unknown;
  [key: string]: unknown;
}

interface ChatCompletionResult {
  choices: { message: { content?: string | null } }[];
}

let cached: ZaiClient | null = null;

/** True when the base URL points at the z.ai gateway itself. */
function isZaiGateway(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === 'z.ai' || host.endsWith('.z.ai') || host.endsWith('.bigmodel.cn');
  } catch {
    return false;
  }
}

/** Read ZAI_* environment variables into a config, or null. */
function envConfig(): ZaiEnvConfig | null {
  const baseUrl = process.env.ZAI_BASE_URL?.trim();
  const apiKey = process.env.ZAI_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;

  const config: ZaiEnvConfig = { baseUrl, apiKey };
  const token = process.env.ZAI_TOKEN?.trim();
  const chatId = process.env.ZAI_CHAT_ID?.trim();
  const userId = process.env.ZAI_USER_ID?.trim();
  if (token) config.token = token;
  if (chatId) config.chatId = chatId;
  if (userId) config.userId = userId;
  return config;
}

/**
 * Minimal OpenAI-compatible chat client (fetch-based).
 * Sends ONLY standard parameters — no gateway-specific extras — so strict
 * providers like Groq accept the request. Exposes the same
 * `chat.completions.create()` surface the rest of the app already uses.
 */
export function createOpenAiCompatClient(config: ZaiEnvConfig): ZaiClient {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  async function create(args: ChatCompletionArgs): Promise<ChatCompletionResult> {
    // Whitelist standard OpenAI parameters; drop gateway-only extras.
    const body: Record<string, unknown> = {
      messages: args.messages,
    };
    if (args.model) body.model = args.model;
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    if (typeof args.max_tokens === 'number') body.max_tokens = args.max_tokens;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
    if (config.token) headers['X-Token'] = config.token;
    if (config.chatId) headers['X-Chat-Id'] = config.chatId;
    if (config.userId) headers['X-User-Id'] = config.userId;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = (await res.text().catch(() => '')).slice(0, 500);
      throw new Error(`LLM provider responded ${res.status}: ${errBody}`);
    }

    return (await res.json()) as ChatCompletionResult;
  }

  return {
    chat: { completions: { create } },
  } as unknown as ZaiClient;
}

/**
 * Get the shared LLM client, or null when no credentials exist.
 * Successful instances are cached for the lifetime of the process.
 */
export async function getZai(): Promise<ZaiClient | null> {
  if (cached) return cached;

  const fromEnv = envConfig();
  if (fromEnv) {
    if (isZaiGateway(fromEnv.baseUrl)) {
      // The SDK declares a private constructor in its typings but it is a
      // plain public class at runtime — building the client directly is how
      // we support env-based credentials where no config file exists.
      const Ctor = ZAI as unknown as new (config: ZAIConfig) => ZaiClient;
      cached = new Ctor(fromEnv);
    } else {
      // Third-party OpenAI-compatible provider (Groq, Cerebras, ...).
      cached = createOpenAiCompatClient(fromEnv);
    }
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
