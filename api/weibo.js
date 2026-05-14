export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const r = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {'User-Agent':'Mozilla/5.0','Referer':'https://weibo.com'}
    });
    const data = await r.json();
    const items = data?.data?.realtime || [];
    const music = items.filter(i => 
      i.word?.includes('音乐') || i.word?.includes('歌') || 
      i.word?.includes('专辑') || i.word?.includes('演唱会') ||
      i.word?.includes('MV') || i.word?.includes('新歌')
    );
    res.json({ hot: items.slice(0,20).map(i=>({
      word: i.word,
      num: i.num,
      isMusic: music.some(m=>m.word===i.word)
    }))});
  } catch(e) {
    res.status(500).json({error: e.message});
  }
}
