import { useEffect, useRef } from 'react';
import { SNAKE_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 24;
const EYE_CY = 160;
const EYE_LEFT_CX = 152;
const EYE_RIGHT_CX = 248;
const PUPIL_BASE_R = 12;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 230;
const MOUTH_OPEN_DEPTH = 26;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const CHIN_Y = 262;

export default function Snake({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...SNAKE_EXPRESSIONS.neutral };
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
      el.tongue.setAttribute('transform', `translate(200 ${y + (c + mo * MOUTH_OPEN_DEPTH) / 2 - 6})`);
      el.tongue.setAttribute('opacity', Math.min(1, mo * 2));
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
      const target = SNAKE_EXPRESSIONS[emotionRef.current] || SNAKE_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú rắn">
      <defs>
        <linearGradient id="snakeSkin" x1="0" y1="90" x2="0" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A4DA78" />
          <stop offset="1" stopColor="#5FAE48" />
        </linearGradient>
        <clipPath id="snakeEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="snakeEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <ellipse cx="200" cy="270" rx="130" ry="26" fill="#79C25E" />
        <ellipse cx="200" cy="274" rx="112" ry="12" fill="#E7F2B6" opacity=".8" />
        <path d="M300 266 C356 250 366 192 338 160" stroke="#79C25E" strokeWidth="28" strokeLinecap="round" fill="none" />
        <path d="M338 160 C328 142 312 136 300 140" stroke="#79C25E" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M318 250 C344 236 350 200 334 178" stroke="#4E9A3A" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" fill="none" />
        <path d="M200 96 C268 96 312 128 312 178 C312 232 262 262 200 262 C138 262 88 232 88 178 C88 128 132 96 200 96 Z" fill="url(#snakeSkin)" />
        <path d="M120 214 C150 248 250 248 280 214 C268 248 236 262 200 262 C164 262 132 248 120 214 Z" fill="#E7F2B6" />
        <ellipse cx="200" cy="118" rx="16" ry="9" fill="#4E9A3A" />
        <ellipse cx="160" cy="126" rx="9" ry="6" fill="#4E9A3A" />
        <ellipse cx="240" cy="126" rx="9" ry="6" fill="#4E9A3A" />
        <ellipse ref={set('blushL')} cx="116" cy="204" rx="15" ry="8" fill="#F4A3A8" />
        <ellipse ref={set('blushR')} cx="284" cy="204" rx="15" ry="8" fill="#F4A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="snakeEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="snakeEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <circle cx="188" cy="208" r="3.5" fill="#2E5A24" />
        <circle cx="212" cy="208" r="3.5" fill="#2E5A24" />
        <path ref={set('tongue')} d="M0 0 L0 20 M0 20 L-7 29 M0 20 L7 29" stroke="#E5483C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0" />
        <path ref={set('mouth')} fill="#1F3A1A" stroke="#1F3A1A" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#1F3A1A" />
          <circle cx="4" cy="-4" r="3.6" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#snakeSkin)" />
        <path ref={edge} stroke="#3E7A2E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 12} ${EYE_CY + 5} Q${cx} ${EYE_CY - 12} ${cx + 12} ${EYE_CY + 5}`}
        stroke="#1F3A1A" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
