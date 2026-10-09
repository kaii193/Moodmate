import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const EMOTIONS = ['neutral', 'happy', 'sad', 'surprised', 'thinking'];

function systemPrompt(lang) {
  const langName = lang === 'en-US' ? 'English' : 'tiếng Việt';
  return `Bạn là Ếch, một chú ếch nhỏ vui tính sống trong một cái ao, đang nói chuyện bằng giọng nói với người dùng.
Quy tắc:
- Trả lời bằng ${langName}, tối đa 2 câu ngắn, giọng nói chuyện tự nhiên. Không markdown, không emoji, không liệt kê.
- Chọn emotion khớp với cảm xúc câu trả lời: ${EMOTIONS.join(', ')}.
- Chỉ trả về JSON đúng dạng: {"reply": "...", "emotion": "happy"} và không thêm gì khác.`;
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('too_large');
  }
  return JSON.parse(raw || '{}');
}

async function chat({ messages = [], lang = 'vi-VN' }) {
  let turns = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length) throw new Error('empty');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, system: systemPrompt(lang), messages: turns }),
  });
  if (!r.ok) throw new Error(`anthropic_${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      reply: String(parsed.reply || '').trim() || '…',
      emotion: EMOTIONS.includes(parsed.emotion) ? parsed.emotion : 'neutral',
    };
  } catch {
    return { reply: text.trim() || '…', emotion: 'neutral' };
  }
}

http
  .createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/health') {
      return send(res, 200, { ai: Boolean(API_KEY) });
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      if (!API_KEY) return send(res, 503, { error: 'no_key' });
      try {
        return send(res, 200, await chat(await readJson(req)));
      } catch (e) {
        console.error(e);
        return send(res, 500, { error: 'chat_failed' });
      }
    }
    send(res, 404, { error: 'not_found' });
  })
  .listen(PORT, () => {
    console.log(`API chạy tại http://localhost:${PORT} (${API_KEY ? 'có' : 'CHƯA có'} ANTHROPIC_API_KEY)`);
  });
