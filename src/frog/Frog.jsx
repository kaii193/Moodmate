import { useEffect, useRef } from 'react';
import { EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 34;
const PUPIL_R = 17;
const FACE_CENTER = { x: 200, y: 108 };

export default function Frog({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...EXPRESSIONS.neutral };
    let blink = 0, blinkUntil = 0, nextBlink = performance.now() + 2000, speakOpen = 0, gaze = { x: 0, y: 0 }, raf;

    function drawEye(cx, cy, outerIsLeft, pupil, lid, edge) {
      const top = cy - EYE_R, h = EYE_R * 2, bottom = cy + EYE_R;
      const yO = lerp(top + cur.lidO * h, bottom + 2, blink);
      const yI = lerp(top + cur.lidI * h, bottom + 2, blink);
      const yL = outerIsLeft ? yO : yI;
      const yR = outerIsLeft ? yI : yO;
      lid.setAttribute('d', `M${cx - 38} ${top - 4} L${cx + 38} ${top - 4} L${cx + 38} ${yR} L${cx - 38} ${yL} Z`);
      edge.setAttribute('d', `M${cx - 38} ${yL} L${cx + 38} ${yR}`);
      const lidAmount = Math.max(cur.lidO, cur.lidI, blink);
      edge.setAttribute('opacity', Math.min(1, lidAmount * 8) * (1 - cur.happy));
      lid.setAttribute('opacity', 1 - cur.happy);
      pupil.setAttribute('transform', `translate(${cx + cur.dx + gaze.x} ${cy + cur.dy + gaze.y}) scale(${cur.pr / 17})`);
      pupil.setAttribute('opacity', 1 - cur.happy);
    }

    function drawMouth() {
      const mo = Math.min(1, cur.mo + speakOpen * 0.75);
      const w = cur.mw + speakOpen * 6, c = cur.mc - speakOpen * 4, y = 196;
      el.mouth.setAttribute('d', `M${200 - w} ${y} Q200 ${y + c} ${200 + w} ${y} Q200 ${y + c + mo * 52} ${200 - w} ${y} Z`);
    }

    function drawHead(t) {
      const breathe = reduceMotion ? 0 : Math.sin(t * 1.6) * 0.012;
      const tilt = reduceMotion ? 0 : cur.tilt;
      el.head.setAttribute(
        'transform',
        `rotate(${tilt} 200 200) translate(200 272) scale(${1 - breathe * 0.5} ${1 + breathe}) translate(-200 -272)`
      );
    }

    function updateBlink(now) {
      if (now > nextBlink && cur.happy < 0.5) {
        blinkUntil = now + 150;
        nextBlink = now + 2200 + Math.random() * 4000;
      }
      blink = lerp(blink, now < blinkUntil ? 1 : 0, 0.45);
    }

    function frame(now) {
      const t = now / 1000;
      const target = EXPRESSIONS[emotionRef.current] || EXPRESSIONS.neutral;
      for (const k in target) cur[k] = lerp(cur[k], target[k], 0.14);

      updateBlink(now);
      const level = levelRef.current ? levelRef.current(t) : 0;
      speakOpen = lerp(speakOpen, level, 0.35);

      drawMouth();
      gaze = readGaze(el.svg, FACE_CENTER, EYE_R - PUPIL_R);
      drawEye(132, 108, true, el.pupilL, el.lidL, el.edgeL);
      drawEye(268, 108, false, el.pupilR, el.lidR, el.edgeR);
      el.arcL.setAttribute('opacity', cur.happy);
      el.arcR.setAttribute('opacity', cur.happy);
      el.blushL.setAttribute('opacity', cur.blush);
      el.blushR.setAttribute('opacity', cur.blush);
      drawHead(t);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (name) => (node) => { r.current[name] = node; };

  return (
    <svg ref={set('svg')} className="frog" viewBox="30 30 340 260" role="img" aria-label="Chú ếch">
      <defs>
        <linearGradient id="skin" x1="0" y1="60" x2="0" y2="275" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B9DE6C" />
          <stop offset="1" stopColor="#8CBF42" />
        </linearGradient>
        <clipPath id="eyeClipL"><circle cx="132" cy="108" r={EYE_R} /></clipPath>
        <clipPath id="eyeClipR"><circle cx="268" cy="108" r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <circle cx="132" cy="104" r="50" fill="url(#skin)" />
        <circle cx="268" cy="104" r="50" fill="url(#skin)" />
        <path
          d="M50 198 C50 128 118 116 200 116 C282 116 350 128 350 198 C350 254 290 272 200 272 C110 272 50 254 50 198 Z"
          fill="url(#skin)"
        />
        <ellipse cx="200" cy="242" rx="94" ry="20" fill="#E3F4B4" opacity=".65" />
        <ellipse ref={set('blushL')} cx="92" cy="178" rx="19" ry="9" fill="#F2A2B2" />
        <ellipse ref={set('blushR')} cx="308" cy="178" rx="19" ry="9" fill="#F2A2B2" />

        <Eye cx={132} clip="eyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={268} clip="eyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('mouth')} fill="#17432A" stroke="#17432A" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Eye({ cx, clip, pupil, lid, edge, arc }) {
  const cy = 108;
  return (
    <>
      <circle cx={cx} cy={cy} r={EYE_R} fill="#FFF9E0" />
      <g clipPath={`url(#${clip})`}>
        <g ref={pupil}>
          <circle r="17" fill="#17432A" />
          <circle cx="6" cy="-6" r="5" fill="#fff" />
        </g>
        <path ref={lid} fill="#A3D058" />
        <path ref={edge} stroke="#5E8F2C" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 17} ${cy + 6} Q${cx} ${cy - 16} ${cx + 17} ${cy + 6}`}
        stroke="#17432A" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
