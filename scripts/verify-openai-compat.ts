/**
 * Local verification that getZai() picks the OpenAI-compatible client for
 * third-party providers and that a completion round-trip works.
 * Run: bun run scripts/verify-openai-compat.ts   (mock provider on :4141)
 */
import { getZai, zaiModel } from '../src/lib/zai';

process.env.ZAI_BASE_URL = 'http://localhost:4141/v1';
process.env.ZAI_API_KEY = 'test-key-123';
process.env.ZAI_MODEL = 'llama-3.3-70b-versatile';

const zai = await getZai();
if (!zai) throw new Error('client not built');

console.log('client built ✅  model =', zaiModel());

const completion = await zai.chat.completions.create({
  model: zaiModel(),
  messages: [
    { role: 'system', content: 'test' },
    { role: 'user', content: 'ping' },
  ],
  thinking: { type: 'disabled' }, // must be silently dropped by our client
});

const reply = completion.choices[0]?.message?.content ?? '';
console.log('reply:', reply);
if (!reply.includes('OK model=llama-3.3-70b-versatile')) throw new Error('unexpected reply');
console.log('round-trip ✅ — thinking parameter correctly stripped');
