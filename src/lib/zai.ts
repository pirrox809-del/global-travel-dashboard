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
  model?: string;
  chatModel?: string;
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
  const model = process.env.ZAI_MODEL?.trim();
  if (model) config.model = model;
  const chatModel = process.env.ZAI_CHAT_MODEL?.trim();
  if (chatModel) config.chatModel = chatModel;
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
 *
 * Model auto-discovery: providers rotate model names over time (Groq
 * deprecated llama-3.3-70b-versatile, for example). When the configured
 * model is rejected with a model_not_found error — or ZAI_MODEL is unset —
 * the client queries the provider's GET /models endpoint and picks a
 * usable chat model from its preference list, then caches the choice for
 * the lifetime of the process.
 */
const MODEL_PREFERENCE = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.1-8b-instant',
];

/** Endpoints/safety models that must never be picked as a chat fallback. */
const MODEL_EXCLUDE = /embed|whisper|tts|guard|playai|prompt-guard|safety|rerank|compound/i;

export function createOpenAiCompatClient(config: ZaiEnvConfig): ZaiClient {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const modelsUrl = `${config.baseUrl.replace(/\/+$/, '')}/models`;

  // Working models are cached PER HINT so different callers (chatbot vs
  // brief generator) keep separate lanes — and separate provider rate
  // limits, which most providers enforce per model.
  const resolvedByHint = new Map<string, string>();
  const deadModels = new Set<string>();
  let providerModelIds: string[] | null = null;

  async function listProviderModels(): Promise<string[]> {
    if (providerModelIds) return providerModelIds;
    providerModelIds = [];
    try {
      const res = await fetch(modelsUrl, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: { id?: string }[] };
        providerModelIds = (data?.data ?? [])
          .map((m) => m.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
      }
    } catch {
      // Provider without a /models endpoint — fall through.
    }
    return providerModelIds;
  }

  /** Next model name to try for this hint, skipping anything attempted. */
  async function nextModel(tried: Set<string>, hint?: string): Promise<string | null> {
    const hintKey = hint ?? '__default__';
    const cached = resolvedByHint.get(hintKey);
    if (cached && !tried.has(cached)) return cached;
    if (hint && !tried.has(hint)) return hint;
    const configured = config.model;
    if (configured && !tried.has(configured)) return configured;

    const ids = await listProviderModels();
    for (const pref of MODEL_PREFERENCE) {
      if (ids.includes(pref) && !tried.has(pref) && !deadModels.has(pref)) return pref;
    }
    const fallback = ids.find((id) => !MODEL_EXCLUDE.test(id) && !tried.has(id) && !deadModels.has(id));
    return fallback ?? null;
  }

  async function create(args: ChatCompletionArgs): Promise<ChatCompletionResult> {
    // Whitelist standard OpenAI parameters; drop gateway-only extras.
    const baseBody: Record<string, unknown> = {
      messages: args.messages,
    };
    if (typeof args.temperature === 'number') baseBody.temperature = args.temperature;
    // Reasoning models (e.g. gpt-oss-*) spend part of the token budget
    // "thinking"; without an explicit budget the visible answer can come
    // back truncated. 8192 leaves room for both.
    if (typeof args.max_tokens === 'number') baseBody.max_tokens = args.max_tokens;
    else baseBody.max_tokens = 8192;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
    if (config.token) headers['X-Token'] = config.token;
    if (config.chatId) headers['X-Chat-Id'] = config.chatId;
    if (config.userId) headers['X-User-Id'] = config.userId;

    const tried = new Set<string>();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const model = await nextModel(tried, args.model);
      if (!model) break;
      tried.add(model);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...baseBody, model }),
      });

      if (res.ok) {
        // Cache the working model for this lane's subsequent requests.
        resolvedByHint.set(args.model ?? '__default__', model);
        return (await res.json()) as ChatCompletionResult;
      }

      const errBody = (await res.text().catch(() => '')).slice(0, 500);
      lastError = new Error(`LLM provider responded ${res.status}: ${errBody}`);

      // A model the provider has never heard of (or has decommissioned)
      // stays dead for the lifetime of this instance — never waste a
      // request on it again.
      if (res.status === 404 && /does not exist|model_not_found|model terminated/i.test(errBody)) {
        deadModels.add(model);
      }

      // Retry with another model only on "unknown model" style errors.
      const modelProblem = res.status === 404 || (res.status === 400 && /model/i.test(errBody));
      if (!modelProblem) throw lastError;
    }

    throw (
      lastError ??
      new Error('No usable chat model found on the configured LLM provider')
    );
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

/**
 * Preferred model for the site chatbot (ZAI_CHAT_MODEL).
 * Defaults to a fast, light model so the chat stays snappy AND rides its
 * own rate-limit lane, separate from the heavy brief-generation calls
 * (Groq enforces limits per model). If the provider rejects it, the
 * client's auto-discovery takes over seamlessly.
 */
export function zaiChatModel(): string | undefined {
  return process.env.ZAI_CHAT_MODEL?.trim() || 'llama-3.1-8b-instant';
}
