import { fetchJson, send } from './_utils.js';

export default async function handler(req, res) {
  try {
    const data = await fetchJson('https://weibo.com/ajax/side/hotSearch', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const words = data?.data?.realtime || [];
    const musicKeys = ['音乐', '歌', '演唱会', '专辑', '乐队', 'OST', 'MV', '新曲'];
    const hot = words.slice(0, 30).map((item) => ({
      word: item.word || item.note || '',
      num: item.num || item.raw_hot || 0,
      isMusic: musicKeys.some((key) => String(item.word || item.note || '').includes(key))
    })).filter((item) => item.word);
    return send(res, 200, { hot });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, hot: [] });
  }
}
