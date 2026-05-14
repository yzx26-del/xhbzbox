import { fetchJson, getEnv, send } from './_utils.js';

const endpoints = {
  'movie-now': '/movie/now_playing?language=zh-CN&region=CN&page=1',
  'movie-upcoming': '/movie/upcoming?language=zh-CN&region=CN&page=1',
  'tv-on-air': '/tv/on_the_air?language=zh-CN&page=1',
  'tv-today': '/tv/airing_today?language=zh-CN&page=1'
};

export default async function handler(req, res) {
  const apiKey = getEnv('TMDB_API_KEY', res);
  if (!apiKey) return;

  const type = req.query.type || 'movie-now';
  const endpoint = endpoints[type];
  if (!endpoint) return send(res, 400, { error: 'Invalid type' });

  try {
    const joiner = endpoint.includes('?') ? '&' : '?';
    const data = await fetchJson(`https://api.themoviedb.org/3${endpoint}${joiner}api_key=${apiKey}`);
    return send(res, 200, data);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, details: error.data });
  }
}
