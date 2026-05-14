import { fetchJson, send } from './_utils.js';

export default async function handler(req, res) {
  const id = String(req.query.id || '3779629').replace(/[^\d]/g, '') || '3779629';
  try {
    const data = await fetchJson(`https://music.163.com/api/playlist/detail?id=${id}`, {
      headers: {
        Referer: 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const tracks = data?.result?.tracks || [];
    const songs = tracks.slice(0, 30).map((song) => ({
      name: song.name,
      artist: (song.artists || []).map((a) => a.name).join(' / '),
      album: song.album?.name || '',
      cover: song.album?.picUrl || ''
    }));
    return send(res, 200, { songs });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, songs: [] });
  }
}
