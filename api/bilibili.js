export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const r = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=3&type=all', {
      headers: {'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com'}
    });
    const data = await r.json();
    const list = data?.data?.list || [];
    res.json({ videos: list.slice(0,20).map(v=>({
      title: v.title,
      author: v.owner?.name || '',
      play: v.stat?.view || 0,
      cover: v.pic || '',
      url: `https://www.bilibili.com/video/${v.bvid}`,
      bvid: v.bvid
    }))});
  } catch(e) {
    res.status(500).json({error: e.message});
  }
}
