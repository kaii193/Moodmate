import { useEffect, useRef } from 'react';
import { GEMINI_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 20;
const EYE_CY = 176;
const EYE_LEFT_CX = 154;
const EYE_RIGHT_CX = 246;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 242;
const MOUTH_OPEN_DEPTH = 24;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const CHIN_Y = 288;

export default function Gemini({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...GEMINI_EXPRESSIONS.neutral };
    let blink = 0, blinkUntil = 0, nextBlink = performance.now() + 1800, speakOpen = 0, gaze = { x: 0, y: 0 }, raf;

    function drawEye(cx, outerIsLeft, pupil, lid, edge, arc) {
      const top = EYE_CY - EYE_R, h = EYE_R * 2, bottom = EYE_CY + EYE_R, half = EYE_R + 4;
      const yO = lerp(top + cur.lidO * h, bottom + 2, blink);
      const yI = lerp(top + cur.lidI * h, bottom + 2, blink);
      const yL = outerIsLeft ? yO : yI;
      const yR = outerIsLeft ? yI : yO;
      lid.setAttribute('d', `M${cx - half} ${top - 4} L${cx + half} ${top - 4} L${cx + half} ${yR} L${cx - half} ${yL} Z`);
      edge.setAttribute('d', `M${cx - half} ${yL} L${cx + half} ${yR}`);
      const lidAmount = Math.max(cur.lidO, cur.lidI, blink);
      edge.setAttribute('opacity', Math.min(1, lidAmount * 8) * (1 - cur.happy));
      lid.setAttribute('opacity', 1 - cur.happy);
      pupil.setAttribute('transform', `translate(${cx + cur.dx + gaze.x} ${EYE_CY + cur.dy + gaze.y}) scale(${cur.pr / PUPIL_BASE_R})`);
      pupil.setAttribute('opacity', 1 - cur.happy);
      arc.setAttribute('opacity', cur.happy);
    }

    function drawMouth() {
      const mo = Math.min(1, cur.mo + speakOpen * 0.75);
      const w = cur.mw + speakOpen * 5, c = cur.mc - speakOpen * 3, y = MOUTH_Y;
      el.mouth.setAttribute('d', `M${200 - w} ${y} Q200 ${y + c} ${200 + w} ${y} Q200 ${y + c + mo * MOUTH_OPEN_DEPTH} ${200 - w} ${y} Z`);
    }

    function drawHead(t) {
      const breathe = reduceMotion ? 0 : Math.sin(t * 1.6) * 0.012;
      const tilt = reduceMotion ? 0 : cur.tilt;
      el.head.setAttribute(
        'transform',
        `rotate(${tilt} 200 200) translate(200 ${CHIN_Y}) scale(${1 - breathe * 0.5} ${1 + breathe}) translate(-200 -${CHIN_Y})`
      );
    }

    function updateBlink(now) {
      if (now > nextBlink && cur.happy < 0.5) {
        blinkUntil = now + BLINK_MS;
        nextBlink = now + 2200 + Math.random() * 4000;
      }
      blink = lerp(blink, now < blinkUntil ? 1 : 0, BLINK_EASE);
    }

    function frame(now) {
      const t = now / 1000;
      const target = GEMINI_EXPRESSIONS[emotionRef.current] || GEMINI_EXPRESSIONS.neutral;
      for (const k in target) cur[k] = lerp(cur[k], target[k], EXPRESSION_EASE);

      updateBlink(now);
      gaze = readGaze(el.svg, FACE_CENTER, EYE_R - PUPIL_BASE_R);
      const level = levelRef.current ? levelRef.current(t) : 0;
      speakOpen = lerp(speakOpen, level, SPEAK_EASE);

      drawMouth();
      drawEye(EYE_LEFT_CX, true, el.pupilL, el.lidL, el.edgeL, el.arcL);
      drawEye(EYE_RIGHT_CX, false, el.pupilR, el.lidR, el.edgeR, el.arcR);
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Song Tử">
      <defs>
        <linearGradient id="geminiSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE3CC" />
          <stop offset="1" stopColor="#F6C6A2" />
        </linearGradient>
        <clipPath id="geminiEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="geminiEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <circle cx="94" cy="108" r="30" fill="#4C7BE0" />
        <circle cx="306" cy="108" r="30" fill="#F2B637" />
        <path d="M200 98 C270 98 312 142 312 198 C312 254 264 288 200 288 C136 288 88 254 88 198 C88 142 130 98 200 98 Z" fill="url(#geminiSkin)" />
        <path d="M200 80 C130 80 80 120 80 192 C92 162 112 144 136 136 C152 152 178 152 200 136 Z" fill="#4C7BE0" />
        <path d="M200 80 C270 80 320 120 320 192 C308 162 288 144 264 136 C248 152 222 152 200 136 Z" fill="#F2B637" />
        <path d="M108 98 L113 108 L124 109 L116 116 L118 127 L108 121 L98 127 L100 116 L92 109 L103 108 Z" fill="#F2B637" />
        <path d="M292 98 L297 108 L308 109 L300 116 L302 127 L292 121 L282 127 L284 116 L276 109 L287 108 Z" fill="#4C7BE0" />
        <ellipse ref={set('blushL')} cx="122" cy="214" rx="14" ry="7" fill="#F49A9A" />
        <ellipse ref={set('blushR')} cx="278" cy="214" rx="14" ry="7" fill="#F49A9A" />

        <Eye cx={EYE_LEFT_CX} clip="geminiEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="geminiEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path d="M195 214 Q200 219 205 214" stroke="#C98B6A" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path ref={set('mouth')} fill="#3A2418" stroke="#3A2418" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Eye({ cx, clip, pupil, lid, edge, arc }) {
  return (
    <>
      <circle cx={cx} cy={EYE_CY} r={EYE_R} fill="#FFFBF2" />
      <g clipPath={`url(#${clip})`}>
        <g ref={pupil}>
          <circle r={PUPIL_BASE_R} fill="#3A2418" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#geminiSkin)" />
        <path ref={edge} stroke="#C98B6A" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 10} ${EYE_CY + 5} Q${cx} ${EYE_CY - 10} ${cx + 10} ${EYE_CY + 5}`}
        stroke="#3A2418" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
