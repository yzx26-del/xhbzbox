import { fetchJson, getEnv, send } from './_utils.js';

export default async function handler(req, res) {
  const apiKey = getEnv('RAWG_API_KEY', res);
  if (!apiKey) return;

  const params = new URLSearchParams();
  params.set('key', apiKey);
  params.set('dates', req.query.dates || '');
  params.set('ordering', req.query.ordering || '-released');
  params.set('page_size', req.query.page_size || '10');

  try {
    const data = await fetchJson(`https://api.rawg.io/api/games?${params.toString()}`);
    delete data.next;
    delete data.previous;
    return send(res, 200, data);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, details: error.data });
  }
}
