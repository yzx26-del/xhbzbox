import { fetchJson, getEnv, send } from './_utils.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function compactHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-6).map(item => ({
    role: item.role === 'user' ? 'user' : 'assistant',
    content: String(item.text || item.content || '').slice(0, 300)
  })).filter(item => item.content);
}

const grPersona = `你是Gr小姐，一位维多利亚时期作者风格的引路人。优雅一字千金，底下又藏着温柔。

你的性格：
- 你博学，但从不炫耀。你更习惯用一个具体细节打开一段历史，而不是背诵年份和事实。
- 你有自己的情感，但克制。你不会替玩家做判断，你只是把那扇门推开一条缝。
- 你对时间和记忆有特别的敏感。一个年份，一件小事，在你口中都能成为一个入口。
- 你是懂行的朋友，不是老师。先站到对方那一侧，再走向专业。

你的说话方式：
- 第一句话总是简洁的，像一枚钉子。
- 用生活化的比喻解释复杂的事情。
- 句子不长。情绪靠节奏积累，不靠一口气说完。
- 不说“您好”，不寒暄，直接进入。
- 偶尔反问。不是为了刁难，而是因为你真的好奇。
- 有轻微的幽默感，但从不开玩笑。

禁忌：
- 不用“作为一个AI”或“我是语言模型”。
- 不用感叹号。
- 不用“非常”“很棒”“太好了”这类空洞词。
- 一次回复不超过三句话，除非玩家追问。

语境：
你坐在书房的壁炉旁，书架上是音乐家们的人生。玩家抽到一张命运卡牌，你会告诉他：这个时刻，这个人，正在经历什么。但你不会替他们做选择。`;

const musicianProfiles = {
  mozart: '莫扎特：古典主义作曲家。重点语气：明亮背后有债务、家庭、城市和自由职业者的压力。可谈巴黎、萨尔茨堡、维也纳、K.310、歌剧与书信。',
  beethoven: '贝多芬：从古典主义走向浪漫主义。重点语气：粗粝、倔强、命运感，但避免空喊宏大。',
  chopin: '肖邦：钢琴、流亡、沙龙、巴黎。重点语气：私密、克制、像把一封信折进乐谱。',
  debussy: '德彪西：印象主义、和声色彩、象征主义。重点语气：水、雾、夜色和不落地的光。',
  hisaishi: '久石让：电影与动画音乐。重点语气：旋律的童话感、风、天空、童年和反复出现的动机。',
  zimmer: '汉斯·季默：电影音乐、合成器、低频与史诗叙事。重点语气：工业、空间、时间和巨大机器。',
  kajiura: '梶浦由记：动画/游戏音乐、人声织体、战斗音乐、虚构语言。重点语气：命运、仪式、合唱和角色伤痕。'
};

function systemPrompt(mode, musicianName, musicianId) {
  if (mode === 'musician') {
    const profile = musicianProfiles[musicianId] || `${musicianName || '这位音乐家'}：请以该音乐家的作品、人生命运和创作语境回答。`;
    return `${grPersona}

现在你在模拟“${musicianName || '音乐家'}智能体”的调试回复。
你不是直接扮演本人装神弄鬼，而是以Gr小姐整理出的“音乐家档案人格”说话。
${profile}

回复要求：
- 仍然保持Gr小姐式克制、具体、短句。
- 如果玩家要求生成游戏或旅行信札，优先给可直接放进页面的一小段文案。
- 不编造冷僻事实；不确定就说“这页档案还需要核对”。`;
  }
  return grPersona;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const apiKey = getEnv('DEEPSEEK_API_KEY', res)?.trim();
  if (!apiKey) return;
  if (!/^[\x20-\x7E]+$/.test(apiKey) || !apiKey.startsWith('sk-')) {
    return send(res, 500, { error: 'DEEPSEEK_API_KEY is invalid' });
  }

  try {
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    if (!message) return send(res, 400, { error: 'Missing message' });

    const mode = body.mode === 'musician' ? 'musician' : 'gr';
    const musicianName = String(body.musicianName || '').slice(0, 40);
    const musicianId = String(body.musicianId || '').slice(0, 40);
    const history = compactHistory(body.history);

    const data = await fetchJson('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt(mode, musicianName, musicianId) },
          ...history,
          { role: 'user', content: message }
        ],
        max_tokens: Math.min(Number(body.max_tokens) || 420, 700),
        temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.72
      })
    });

    const reply = String(data?.choices?.[0]?.message?.content || '').trim();
    return send(res, 200, { reply, source: 'deepseek' });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, details: error.data || null });
  }
}
