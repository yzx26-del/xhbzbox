import { fetchJson, getEnv, send } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const apiKey = getEnv('DEEPSEEK_API_KEY', res);
  if (!apiKey) return;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!body.prompt) return send(res, 400, { error: 'Missing prompt' });

    const data = await fetchJson('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: body.prompt }],
        max_tokens: 4000,
        temperature: 0.2
      })
    });

    return send(res, 200, data);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, details: error.data });
  }
}
