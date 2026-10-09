import { useCallback, useEffect, useRef, useState } from 'react';
import Frog from './frog/Frog.jsx';
import Fox from './fox/Fox.jsx';
import Rat from './zodiac/rat/Rat.jsx';
import Buffalo from './zodiac/buffalo/Buffalo.jsx';
import Tiger from './zodiac/tiger/Tiger.jsx';
import Cat from './zodiac/cat/Cat.jsx';
import Dragon from './zodiac/dragon/Dragon.jsx';
import Snake from './zodiac/snake/Snake.jsx';
import Horse from './zodiac/horse/Horse.jsx';
import Goat from './zodiac/goat/Goat.jsx';
import Monkey from './zodiac/monkey/Monkey.jsx';
import Rooster from './zodiac/rooster/Rooster.jsx';
import Dog from './zodiac/dog/Dog.jsx';
import Pig from './zodiac/pig/Pig.jsx';
import Coffee from './coffee/Coffee.jsx';
import Aries from './horoscope/aries/Aries.jsx';
import Taurus from './horoscope/taurus/Taurus.jsx';
import Gemini from './horoscope/gemini/Gemini.jsx';
import Cancer from './horoscope/cancer/Cancer.jsx';
import Leo from './horoscope/leo/Leo.jsx';
import Virgo from './horoscope/virgo/Virgo.jsx';
import Libra from './horoscope/libra/Libra.jsx';
import Scorpio from './horoscope/scorpio/Scorpio.jsx';
import Sagittarius from './horoscope/sagittarius/Sagittarius.jsx';
import Capricorn from './horoscope/capricorn/Capricorn.jsx';
import Aquarius from './horoscope/aquarius/Aquarius.jsx';
import Pisces from './horoscope/pisces/Pisces.jsx';
import { EMOTION_LABELS } from './frog/expressions.js';
import { useAudioLevel } from './hooks/useAudioLevel.js';
import { useSpeech, canRecognize, findVoice } from './hooks/useSpeech.js';
import { askFrog, checkAi } from './lib/brain.js';
import { DEMO_REPLIES } from './lib/demoReply.js';

const STATUS = { listening: 'Đang nghe…', thinking: 'Đang nghĩ…', speaking: 'Đang nói…' };

const CHARACTERS = {
  frog: { label: 'Ếch', Face: Frog },
  fox: { label: 'Cáo', Face: Fox },
  rat: { label: 'Chuột (Tý)', Face: Rat },
  buffalo: { label: 'Trâu (Sửu)', Face: Buffalo },
  tiger: { label: 'Hổ (Dần)', Face: Tiger },
  cat: { label: 'Mèo (Mão)', Face: Cat },
  dragon: { label: 'Rồng (Thìn)', Face: Dragon },
  snake: { label: 'Rắn (Tỵ)', Face: Snake },
  horse: { label: 'Ngựa (Ngọ)', Face: Horse },
  goat: { label: 'Dê (Mùi)', Face: Goat },
  monkey: { label: 'Khỉ (Thân)', Face: Monkey },
  rooster: { label: 'Gà (Dậu)', Face: Rooster },
  dog: { label: 'Chó (Tuất)', Face: Dog },
  pig: { label: 'Lợn (Hợi)', Face: Pig },
  coffee: { label: 'Cà phê sữa đá', Face: Coffee },
  aries: { label: 'Bạch Dương', Face: Aries },
  taurus: { label: 'Kim Ngưu', Face: Taurus },
  gemini: { label: 'Song Tử', Face: Gemini },
  cancer: { label: 'Cự Giải', Face: Cancer },
  leo: { label: 'Sư Tử', Face: Leo },
  virgo: { label: 'Xử Nữ', Face: Virgo },
  libra: { label: 'Thiên Bình', Face: Libra },
  scorpio: { label: 'Bọ Cạp', Face: Scorpio },
  sagittarius: { label: 'Nhân Mã', Face: Sagittarius },
  capricorn: { label: 'Ma Kết', Face: Capricorn },
  aquarius: { label: 'Bảo Bình', Face: Aquarius },
  pisces: { label: 'Song Ngư', Face: Pisces },
};

export default function App() {
  const [lang, setLang] = useState('vi-VN');
  const [character, setCharacter] = useState('frog');
  const [emotion, setEmotion] = useState('neutral');
  const [conv, setConv] = useState('idle');
  const [statusText, setStatusText] = useState('');
  const [caption, setCaption] = useState({ who: 'frog', text: '' });
  const [aiReady, setAiReady] = useState(null);
  const [text, setText] = useState('');
  const [micLive, setMicLive] = useState(false);

  const history = useRef([]);
  const thinkCtl = useRef(null);
  const audio = useAudioLevel();
  const speech = useSpeech();

  useEffect(() => { checkAi().then(setAiReady); }, []);

  const getSpeakLevel = useCallback((t) => audio.readLevel() ?? speech.readLevel(t), [audio, speech]);

  const go = (state, label) => { setConv(state); setStatusText(label || ''); };

  const say = (reply) => {
    setCaption({ who: 'frog', text: reply });
    go('speaking');
    speech.speak(reply, lang, () => setConv((s) => (s === 'speaking' ? 'idle' : s)));
  };

  const handleUser = async (raw) => {
    const msg = raw.trim();
    if (!msg) return;
    setCaption({ who: 'you', text: msg });

    if (!aiReady) { setEmotion('happy'); say(msg); return; }

    history.current.push({ role: 'user', content: msg });
    go('thinking');
    setEmotion('thinking');
    thinkCtl.current?.abort();
    const ctl = new AbortController();
    thinkCtl.current = ctl;
    try {
      const { reply, emotion: emo } = await askFrog(history.current, lang, ctl.signal);
      history.current.push({ role: 'assistant', content: reply });
      setEmotion(emo);
      say(reply);
    } catch (e) {
      if (e.name === 'AbortError') return;
      history.current.pop();
      setEmotion('sad');
      setCaption({ who: 'frog', text: 'Ếch chưa nghe được câu trả lời. Kiểm tra server rồi thử lại nhé.' });
      go('idle');
    }
  };

  const onMic = () => {
    if (speech.isListening()) { speech.listen(lang, {}); return; }
    speech.stopSpeaking();
    thinkCtl.current?.abort();
    audio.stop();
    speech.listen(lang, {
      onStart: () => { setMicLive(true); go('listening'); setEmotion('listening'); },
      onInterim: (t) => setCaption({ who: 'you', text: t }),
      onFinal: handleUser,
      onError: (err) => {
        if (err === 'not-allowed') setCaption({ who: 'frog', text: 'Không dùng được micro. Bạn gõ chữ vào ô bên cạnh nhé.' });
        if (err === 'no-speech') setCaption({ who: 'frog', text: 'Ếch không nghe thấy gì. Bấm micro và nói lại.' });
      },
      onEnd: (gotFinal) => {
        setMicLive(false);
        if (!gotFinal) { setConv((s) => (s === 'listening' ? 'idle' : s)); setEmotion('neutral'); }
      },
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    speech.stopSpeaking();
    handleUser(text);
    setText('');
  };

  const onMirror = async () => {
    if (audio.source === 'mic') { audio.stop(); go('idle'); return; }
    speech.stopSpeaking();
    try {
      await audio.startMic();
      go('speaking', 'Đang nhại giọng bạn');
      setCaption({ who: 'frog', text: 'Nói gì đi, ếch sẽ mấp máy theo.' });
    } catch {
      setCaption({ who: 'frog', text: 'Không mở được micro. Thử nút phát file âm thanh nhé.' });
    }
  };

  const onFile = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    speech.stopSpeaking();
    go('speaking', 'Đang phát ' + f.name);
    setCaption({ who: 'frog', text: '' });
    try { await audio.playFile(f, () => go('idle')); }
    catch { setCaption({ who: 'frog', text: 'Không phát được file này.' }); go('idle'); }
  };

  const onDemo = () => {
    thinkCtl.current?.abort();
    audio.stop();
    go('speaking');
    speech.speakSequence(DEMO_REPLIES[lang], lang, {
      onSegment: (segment) => { setEmotion(segment.emotion); setCaption({ who: 'frog', text: segment.text }); },
      onEnd: () => setConv((s) => (s === 'speaking' ? 'idle' : s)),
    });
  };

  const idleLabel = aiReady === null ? 'Đang kết nối…'
    : aiReady ? 'Đã kết nối' : 'Chưa có API key: ếch sẽ đọc lại câu bạn gõ';
  const dotClass = conv === 'idle' ? (aiReady ? 'on' : '') : 'busy';
  const { Face } = CHARACTERS[character];
  const isVoiceMissing = speech.voices.length > 0 && !findVoice(speech.voices, lang);

  return (
    <>
      <header>
        <div className="brand">Pond</div>
        <div className="header-controls">
          <select value={character} onChange={(e) => setCharacter(e.target.value)} aria-label="Nhân vật">
            {Object.entries(CHARACTERS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Ngôn ngữ">
            <option value="vi-VN">Tiếng Việt</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </header>

      <main>
        <Face emotion={emotion} getSpeakLevel={getSpeakLevel} />

        <div className="caption" aria-live="polite">
          <span className={caption.who === 'you' ? 'you' : ''}>{caption.text}</span>
        </div>
        <div className="status">
          <span className={`dot ${dotClass}`} />
          <span>{statusText || STATUS[conv] || idleLabel}</span>
        </div>

        <div className="dock">
          <div className="talk">
            {canRecognize && (
              <button type="button" className={`mic ${micLive ? 'live' : ''}`} onClick={onMic} aria-label="Bấm để nói">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            )}
            <form onSubmit={onSubmit}>
              <input
                type="text" value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Nói gì đó với ếch…" autoComplete="off" aria-label="Tin nhắn"
              />
              <button className="send" type="submit">Gửi</button>
            </form>
          </div>

          <div className="tools" role="group" aria-label="Thử biểu cảm và lip-sync">
            {Object.entries(EMOTION_LABELS).map(([key, label]) => (
              <button key={key} className="chip" aria-pressed={emotion === key} onClick={() => setEmotion(key)}>
                {label}
              </button>
            ))}
            <span className="sep" />
            <button className="chip" onClick={onDemo}>Demo đoạn văn</button>
            <span className="sep" />
            <button className="chip" aria-pressed={audio.source === 'mic'} onClick={onMirror}>
              Nhại giọng qua micro
            </button>
            <label className="chip">
              Phát file âm thanh
              <input type="file" accept="audio/*" onChange={onFile} />
            </label>
          </div>
          <p className="note">
            Khi ếch trả lời, khẩu hình chạy theo nhịp từ của giọng đọc trình duyệt. Hai nút cuối dùng phân tích âm lượng thật (RMS).
          </p>
          {isVoiceMissing && (
            <p className="note" role="status">
              Trình duyệt này chưa có giọng đọc cho ngôn ngữ đang chọn nên sẽ đọc bằng giọng mặc định.
              Mở bằng Microsoft Edge (có giọng Hoài My, Nam Minh), hoặc cài thêm giọng trong Windows:
              Settings → Time &amp; language → Speech → Add voices.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
