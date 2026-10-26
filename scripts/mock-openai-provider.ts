/**
 * Mock Groq-like provider used ONLY for local verification of the
 * OpenAI-compatible client path in src/lib/zai.ts.
 * Simulates real Groq behaviour:
 *  - rejects the gateway-only `thinking` parameter (HTTP 400)
 *  - returns model_not_found for the deprecated llama-3.3-70b-versatile
 *  - serves a GET /models list (including a non-chat model)
 *  - answers chat completions for the other models
 */
const DEPRECATED = new Set(['llama-3.3-70b-versatile']);

Bun.serve({
  port: 4141,
  async fetch(req) {
    const url = new URL(req.url);
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer test-key-123')) {
      return Response.json({ error: { message: 'Invalid API key' } }, { status: 401 });
    }

    if (url.pathname === '/v1/models') {
      return Response.json({
        data: [
          { id: 'llama-3.3-70b-versatile' },
          { id: 'openai/gpt-oss-120b' },
          { id: 'llama-3.1-8b-instant' },
          { id: 'text-embedding-3-small' },
          { id: 'playai-tts' },
        ],
      });
    }

    if (url.pathname !== '/v1/chat/completions') {
      return Response.json({ error: { message: 'not found' } }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    if ('thinking' in body) {
      return Response.json(
        { error: { message: `Unrecognized request arguments supplied: thinking`, type: 'invalid_request_error' } },
        { status: 400 },
      );
    }
    const model = String(body.model ?? '');
    if (DEPRECATED.has(model)) {
      return Response.json(
        { error: { message: `The model \`${model}\` does not exist or you do not have access to it.`, type: 'invalid_request_error', code: 'model_not_found' } },
        { status: 404 },
      );
    }
    return Response.json({
      id: 'mock-1',
      choices: [{ index: 0, message: { role: 'assistant', content: `OK model=${model} msgs=${(body.messages as unknown[]).length}` } }],
    });
  },
});
console.log('mock provider on :4141');
