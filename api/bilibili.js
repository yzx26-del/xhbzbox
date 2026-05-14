import { fetchJson, send } from './_utils.js';

export default async function handler(req, res) {
  try {
    const data = await fetchJson('https://api.bilibili.com/x/web-interface/ranking/v2?rid=3&type=all', {
      headers: {
        Referer: 'https://www.bilibili.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const videos = (data?.data?.list || []).slice(0, 20).map((item) => ({
      title: item.title,
      author: item.owner?.name || '',
      cover: item.pic || '',
      play: item.stat?.view || 0,
      url: `https://www.bilibili.com/video/${item.bvid}`
    }));
    return send(res, 200, { videos });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, videos: [] });
  }
}
