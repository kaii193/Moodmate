import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioLevel() {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const bufRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const [source, setSource] = useState(null);

  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const attach = (node, toSpeakers) => {
    const ctx = ensureCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    node.connect(analyser);
    if (toSpeakers) analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    bufRef.current = new Float32Array(analyser.fftSize);
  };

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
    audioRef.current = null;
    analyserRef.current = null;
    setSource(null);
  }, []);

  const startMic = useCallback(async () => {
    stop();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    attach(ensureCtx().createMediaStreamSource(stream), false);
    setSource('mic');
  }, [stop]);

  const playFile = useCallback(async (file, onEnded) => {
    stop();
    const audio = new Audio(URL.createObjectURL(file));
    audioRef.current = audio;
    attach(ensureCtx().createMediaElementSource(audio), true);
    audio.onended = () => { stop(); onEnded?.(); };
    setSource('file');
    await audio.play();
  }, [stop]);

  const attachStream = useCallback((stream) => {
    stop();
    attach(ensureCtx().createMediaStreamSource(stream), false);
    setSource('stream');
  }, [stop]);

  const readLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    const buf = bufRef.current;
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length);
    return Math.min(1, Math.max(0, (rms - 0.015) * 7));
  }, []);

  useEffect(() => stop, [stop]);

  return { source, startMic, playFile, attachStream, stop, readLevel };
}
