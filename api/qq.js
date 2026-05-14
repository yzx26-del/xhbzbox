import { fetchJson, send } from './_utils.js';

export default async function handler(req, res) {
  try {
    const data = await fetchJson('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        comm: { ct: 24, cv: 0 },
        req_1: {
          module: 'musicToplist.ToplistInfoServer',
          method: 'GetDetail',
          param: { topId: 27, offset: 0, num: 20, period: '' }
        }
      })
    });
    const list = data?.req_1?.data?.songInfoList || [];
    const songs = list.map((item) => {
      const albumMid = item.album?.mid || '';
      return {
        name: item.name,
        artist: (item.singer || []).map((s) => s.name).join(' / '),
        album: item.album?.name || '',
        cover: albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : ''
      };
    });
    return send(res, 200, { songs });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, songs: [] });
  }
}
