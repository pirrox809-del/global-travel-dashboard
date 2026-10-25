/**
 * Mock Groq-like provider used ONLY for local verification of the
 * OpenAI-compatible client path in src/lib/zai.ts.
 * Behaviour: rejects any request body containing the gateway-only
 * `thinking` parameter (like Groq does), otherwise answers normally.
 */
Bun.serve({
  port: 4141,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== '/v1/chat/completions') {
      return Response.json({ error: { message: 'not found' } }, { status: 404 });
    }
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer test-key-123')) {
      return Response.json({ error: { message: 'Invalid API key' } }, { status: 401 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    if ('thinking' in body) {
      return Response.json(
        { error: { message: `Unrecognized request arguments supplied: thinking`, type: 'invalid_request_error' } },
        { status: 400 },
      );
    }
    return Response.json({
      id: 'mock-1',
      choices: [{ index: 0, message: { role: 'assistant', content: `OK model=${String(body.model)} msgs=${(body.messages as unknown[]).length}` } }],
    });
  },
});
console.log('mock provider on :4141');
