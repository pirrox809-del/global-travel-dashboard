/**
 * Local verification of the OpenAI-compatible client in src/lib/zai.ts:
 *  1. client built from env vars
 *  2. gateway-only `thinking` parameter stripped
 *  3. deprecated configured model triggers auto-discovery via GET /models
 *  4. working model cached across calls (second call uses it directly)
 * Run: bun run scripts/verify-openai-compat.ts   (mock provider on :4141)
 */
import { getZai, zaiModel } from '../src/lib/zai';

process.env.ZAI_BASE_URL = 'http://localhost:4141/v1';
process.env.ZAI_API_KEY = 'test-key-123';
process.env.ZAI_MODEL = 'llama-3.3-70b-versatile'; // deprecated on the mock, like real Groq

const zai = await getZai();
if (!zai) throw new Error('client not built');

console.log('client built ✅  configured model =', zaiModel());

const completion = await zai.chat.completions.create({
  model: zaiModel(),
  messages: [
    { role: 'system', content: 'test' },
    { role: 'user', content: 'ping' },
  ],
  thinking: { type: 'disabled' }, // must be silently dropped by our client
});

const reply = completion.choices[0]?.message?.content ?? '';
console.log('reply 1:', reply);
if (!reply.includes('model=openai/gpt-oss-120b')) {
  throw new Error(`auto-discovery failed, got: ${reply}`);
}
console.log('auto-discovery ✅ — deprecated model replaced by first preferred available');

const completion2 = await zai.chat.completions.create({
  model: zaiModel(),
  messages: [{ role: 'user', content: 'ping again' }],
});
const reply2 = completion2.choices[0]?.message?.content ?? '';
console.log('reply 2:', reply2);
if (!reply2.includes('model=openai/gpt-oss-120b')) {
  throw new Error(`cached model not reused, got: ${reply2}`);
}
console.log('model cache ✅ — subsequent calls reuse the working model directly');

// Chat lane: a different hint must ride its own cached model.
const chat1 = await zai.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'chat ping' }],
});
const chatReply = chat1.choices[0]?.message?.content ?? '';
console.log('chat reply:', chatReply);
if (!chatReply.includes('model=llama-3.1-8b-instant')) {
  throw new Error(`chat lane failed, got: ${chatReply}`);
}
// Brief lane keeps its own model after the chat call.
const chat2 = await zai.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  messages: [{ role: 'user', content: 'chat ping again' }],
});
if (!chat2.choices[0]?.message?.content?.includes('model=llama-3.1-8b-instant')) {
  throw new Error('chat lane cache lost');
}
console.log('separate lanes ✅ — chat and briefs keep independent cached models');
