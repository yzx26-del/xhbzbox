import { fetchJson, getEnv, send } from './_utils.js';

function cleanJson(text) {
  const raw = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

function fallbackPlaylist(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  return {
    date,
    month,
    theme: '时光回响',
    subtitle: `${month}月发行的12首品质歌曲，今天先用本地牌阵兜底。`,
    songs: [
      ['传奇','王菲','寓言',2000,'中文','中文经典','华语乐坛长期讨论的流行经典','旧梦忽然开花','空灵,怀旧'],
      ['红豆','王菲','唱游',1998,'中文','中文经典','金曲奖与华语流行评论长期提及','等风也等你','克制,温柔'],
      ['山丘','李宗盛','山丘',2013,'中文','中文当代','金曲奖年度歌曲级别讨论','越过山丘见自己','沧桑,释然'],
      ['如愿','王菲','我和我的父辈',2021,'中文','中文当代','主流影视歌曲现象级传播','愿光替你抵达','温暖,家国'],
      ['浮夸','陈奕迅','U87',2005,'中文','中文经典','香港金曲与粤语流行讨论经典','把孤独唱成火','戏剧,锋利'],
      ['刻在我心底的名字','卢广仲','刻在你心底的名字',2020,'中文','中文当代','金马奖最佳原创电影歌曲','把遗憾藏进光','青春,怅然'],
      ['Billie Jean','Michael Jackson','Thriller',1983,'英文','英文经典','格莱美获奖与流行工业标杆','月光下别回头','律动,悬疑'],
      ['Like a Prayer','Madonna','Like a Prayer',1989,'英文','英文经典','发行时引发宗教与流行文化热议','圣光里有叛逆','神圣,反叛'],
      ['Rolling in the Deep','Adele','21',2010,'英文','英文当代','格莱美年度制作与年度歌曲','伤口敲成战鼓','爆发,决绝'],
      ['Royals','Lorde','Pure Heroine',2013,'英文','英文当代','格莱美年度歌曲，引发反奢华流行讨论','把皇冠放低','冷感,锋利'],
      ['Viva La Vida','Coldplay','Viva La Vida or Death and All His Friends',2008,'英文','英文经典','格莱美年度歌曲并长期流行','王冠落入钟声','史诗,明亮'],
      ['bad guy','Billie Eilish','When We All Fall Asleep, Where Do We Go?',2019,'英文','英文当代','格莱美年度制作与年度歌曲','黑暗也会眨眼','怪诞,俏皮']
    ].map((s, i) => ({
      title: s[0], artist: s[1], album: s[2], year: s[3], month,
      language: s[4], era_tag: s[5], award_or_buzz: s[6],
      tarot_message: s[7], emotion_tags: s[8].split(','),
      story: `${s[0]}以鲜明的音乐记忆点和公共讨论价值，适合作为今天的乐评切口。`,
      card_no: i + 1
    }))
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const apiKey = getEnv('DEEPSEEK_API_KEY', res);
  if (!apiKey) return;

  const date = String(req.query?.date || new Date().toISOString().slice(0, 10));
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const monthName = `${month}月`;

  const prompt = `你是一位拥有30年经验的资深音乐主编兼塔罗牌占卜师。请根据日期 ${date} 生成一份“乐评骰子：12张命运卡牌”每日歌单。

硬性规则：
1. 只选历史上在${monthName}发行的歌曲；如果不能确认发行月份，必须替换。
2. 正好12首：6首中文（可含粤语/闽南语），6首英文。
3. 四组各3首：中文经典（80s-00s）、中文当代（2010至今）、英文经典（80s-00s）、英文当代（2010至今）。
4. 每首至少满足一项：获得金曲奖/格莱美/全英/AMA/Billboard/香港金曲奖/华语金曲奖等；或发行时引发行业讨论；或发行超过5年仍有长期生命力。
5. 禁止网络神曲、短视频爆款、无奖项无讨论的纯流量歌曲。
6. 生成前自检：语言数量、年代数量、发行月份、品质依据。不确定就换歌。

只输出严格JSON，不要Markdown。格式：
{
  "date":"${date}",
  "month":${month},
  "theme":"4字以内",
  "subtitle":"一句话",
  "songs":[
    {
      "card_no":1,
      "group":"中文经典/中文当代/英文经典/英文当代",
      "title":"歌名",
      "artist":"歌手",
      "album":"专辑",
      "year":年份数字,
      "month":${month},
      "language":"中文/英文",
      "era_tag":"80s-00s/10s-至今",
      "award_or_buzz":"奖项或行业讨论依据",
      "tarot_message":"20字内塔罗风格签文",
      "emotion_tags":["情绪1","情绪2"],
      "story":"50字内歌曲故事或乐评切口"
    }
  ]
}`;

  try {
    const data = await fetchJson('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3600,
        temperature: 0.35
      })
    });

    const content = data?.choices?.[0]?.message?.content || '';
    let playlist = JSON.parse(cleanJson(content));
    playlist.date = playlist.date || date;
    playlist.month = playlist.month || month;
    playlist.songs = (playlist.songs || []).slice(0, 12).map((s, i) => ({ ...s, card_no: s.card_no || i + 1 }));
    if (playlist.songs.length !== 12) playlist = fallbackPlaylist(date);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return send(res, 200, playlist);
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=1800');
    return send(res, 200, fallbackPlaylist(date));
  }
}
