import { useCallback, useEffect, useRef, useState } from 'react';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canRecognize = Boolean(SR);

export function findVoice(voices, lang) {
  const wanted = lang.toLowerCase();
  const base = wanted.slice(0, 2);
  return voices.find((v) => v.lang.toLowerCase() === wanted) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base));
}

export function useSpeech() {
  const ttsRef = useRef({ active: false, pulse: 0 });
  const simTimer = useRef(null);
  const recRef = useRef(null);
  const sequenceRef = useRef(0);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const refreshVoices = () => setVoices(synth.getVoices());
    refreshVoices();
    synth.addEventListener('voiceschanged', refreshVoices);
    return () => synth.removeEventListener('voiceschanged', refreshVoices);
  }, []);

  const cancelUtterance = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    clearTimeout(simTimer.current);
    ttsRef.current.active = false;
  }, []);

  const speakUtterance = useCallback((text, lang, onEnd) => {
    cancelUtterance();
    const tts = ttsRef.current;
    const done = () => { tts.active = false; clearTimeout(simTimer.current); onEnd?.(); };
    const simulate = () => { tts.active = true; simTimer.current = setTimeout(done, Math.max(1200, text.length * 65)); };
    if (!('speechSynthesis' in window)) return simulate();

    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = findVoice(synth.getVoices(), lang);
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.25;

    let started = false;
    u.onstart = () => { started = true; tts.active = true; clearTimeout(simTimer.current); };
    u.onboundary = () => { tts.pulse = 1; };
    u.onend = done;
    u.onerror = () => (started ? done() : simulate());
    synth.speak(u);
    simTimer.current = setTimeout(() => { if (!started) { synth.cancel(); simulate(); } }, 1500);
  }, [cancelUtterance]);

  const stopSpeaking = useCallback(() => {
    sequenceRef.current += 1;
    cancelUtterance();
  }, [cancelUtterance]);

  const speak = useCallback((text, lang, onEnd) => {
    sequenceRef.current += 1;
    speakUtterance(text, lang, onEnd);
  }, [speakUtterance]);

  const speakSequence = useCallback((segments, lang, { onSegment, onEnd }) => {
    const sequenceId = ++sequenceRef.current;
    const speakFrom = (index) => {
      if (sequenceId !== sequenceRef.current) return;
      if (index >= segments.length) { onEnd?.(); return; }
      onSegment?.(segments[index]);
      speakUtterance(segments[index].text, lang, () => speakFrom(index + 1));
    };
    speakFrom(0);
  }, [speakUtterance]);

  const readLevel = useCallback((t) => {
    const tts = ttsRef.current;
    if (!tts.active) return 0;
    const syllable = Math.abs(Math.sin(t * 17 + Math.sin(t * 5.3) * 2.2));
    const v = 0.18 + 0.5 * syllable + tts.pulse * 0.35;
    tts.pulse *= 0.86;
    return Math.min(1, v);
  }, []);

  const listen = useCallback((lang, { onStart, onInterim, onFinal, onError, onEnd }) => {
    if (!SR) return;
    if (recRef.current) { recRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    let gotFinal = false;
    rec.onstart = onStart;
    rec.onresult = (ev) => {
      let interim = '', final = '';
      for (const r of ev.results) r.isFinal ? (final += r[0].transcript) : (interim += r[0].transcript);
      if (final) { gotFinal = true; onFinal(final); } else onInterim(interim);
    };
    rec.onerror = (ev) => onError?.(ev.error);
    rec.onend = () => { recRef.current = null; onEnd?.(gotFinal); };
    recRef.current = rec;
    try { rec.start(); } catch { recRef.current = null; }
  }, []);

  const isListening = () => Boolean(recRef.current);

  useEffect(() => () => { stopSpeaking(); recRef.current?.abort(); }, [stopSpeaking]);

  return { speak, speakSequence, stopSpeaking, readLevel, listen, isListening, voices };
}
