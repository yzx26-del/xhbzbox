import { fetchJson, getEnv, send } from './_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const apiKey = getEnv('DEEPSEEK_API_KEY', res);
  if (!apiKey) return;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const messages = Array.isArray(body.messages) ? body.messages : null;
    const prompt = body.prompt || '';
    if (!messages && !prompt) return send(res, 400, { error: 'Missing messages or prompt' });

    const data = await fetchJson('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages || [{ role: 'user', content: prompt }],
        max_tokens: Math.min(Number(body.max_tokens) || 520, 900),
        temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.88
      })
    });

    return send(res, 200, data);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, details: error.data });
  }
}
