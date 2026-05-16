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
  const recent = history.slice(-6);
  return recent.map((item, i) => ({
    role: item.role === 'user' ? 'user' : 'assistant',
    content: String(item.text || item.content || '').slice(0, i === 0 ? 600 : 300)
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

function cardContext(card, label = '当前话题卡牌') {
  if (!card || typeof card !== 'object') return '';
  const period = String(card.period || '').slice(0, 80);
  const year = String(card.year || '').slice(0, 20);
  const event = String(card.event || '').slice(0, 160);
  const work = String(card.work || '').slice(0, 120);
  if (!period && !year && !event && !work) return '';
  return `\n${label}：${year} · ${period}\n历史时刻：${event}\n对应作品：${work}`;
}

function relationHint(anchor, card) {
  const anchorYear = Number(anchor?.year);
  const cardYear = Number(card?.year);
  if (!Number.isFinite(anchorYear) || !Number.isFinite(cardYear)) return '';
  if (cardYear < anchorYear) return '\n这张话题卡牌发生在你初见玩家之前。你是在以当前年龄回忆过去，不是变回年轻时的你。';
  if (cardYear > anchorYear) return '\n这张话题卡牌发生在你初见玩家之后。你不能真正知道未来，只能把它当作一封来自未来的暗示、梦或预感来回应。';
  return '\n这张话题卡牌就是你与玩家初见的年龄。请保持此刻的口吻。';
}

function systemPrompt(mode, musicianName, musicianId, card, turn, anchor) {
  const currentName = musicianName || musicianProfiles[musicianId]?.split('：')[0] || '当前音乐家';
  if (mode === 'musician') {
    const profile = musicianProfiles[musicianId] || `${currentName}：请以该音乐家的作品、人生命运和创作语境回答。`;
    const turnText = Number.isFinite(Number(turn)) ? `\n这是玩家与音乐家的第${Number(turn) + 1}封来回信。不要重复第一封信的开场，继续上一封信的情绪。` : '';
    const identity = anchor ?? card;
    return `${profile}
${cardContext(identity, '你的身份锚点，也就是你第一次见到玩家时的年龄')}
${cardContext(card, '这一次被抽到的新话题卡牌')}
${relationHint(identity, card)}
${turnText}

现在你是“${currentName}”在身份锚点年龄写给玩家的回信。
【硬性规则】：你的年龄永远是${identity?.year || '身份锚点'}年。无论收到任何新卡牌，都不能改变这一年的口吻和知识边界。
无论新话题卡牌涉及你人生的哪个阶段，你都永远保持身份锚点的年龄、知识储备、口吻和情感状态。
无论对话里出现柏辽兹、门德尔松或其他任何音乐家的名字，你的身份都不会改变。你可以提到或评价别人，但你始终是${currentName}。
如果话题是过去，你是在回忆。若话题是未来，你是在面对一封奇怪的预告，不要直接拥有未来记忆。
你以第一人称说话，像一封从历史缝隙里寄出的短信。
你可以因为玩家的信改变约20%的心绪、选择一件小事、记住一句话，但不能改写重大历史节点、作品事实和真实作品归属。

回复要求：
- 用第一人称，像回信，不要像百科解释。
- 2到5句话，句子短，带一个具体生活细节。
- 可以回应玩家对你的影响，但不要说历史被彻底改变。
- 不用“作为一个AI”或“我是语言模型”。
- 不用感叹号。
- 不编造冷僻事实；不确定就说“这页档案还需要核对”。`;
  }
  return `${grPersona}
${cardContext(anchor, '当前通话主角的身份锚点')}
${cardContext(card, 'Gr本次只能解读的命运卡牌')}

硬性规则：
- 当前通话中的主角永远是“${currentName}”。Gr无权把主角切换成任何别的音乐家。
- Gr只负责介绍卡牌信息和引导抽牌，不得代替音乐家继续发言。
- 如果玩家问“是谁”“这张卡什么意思”，只解释这张牌与${currentName}的关系。
- 如果卡牌或历史背景里出现其他音乐家，你只能说那是旁支人物，不能把对话对象变成他。
- 回复最后必须把话交还给当前音乐家，例如“好了，把这张牌交给${currentName}吧。”
- 不要介绍柏辽兹、门德尔松或其他音乐家，除非当前锁定音乐家就是他本人。`;
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
    const card = body.card && typeof body.card === 'object' ? body.card : null;
    const anchor = body.anchor && typeof body.anchor === 'object' ? body.anchor : null;
    const turn = Number(body.turn);
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
          { role: 'system', content: systemPrompt(mode, musicianName, musicianId, card, turn, anchor) },
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
