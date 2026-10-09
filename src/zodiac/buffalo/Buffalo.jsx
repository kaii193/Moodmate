import { useEffect, useRef } from 'react';
import { BUFFALO_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 21;
const EYE_CY = 166;
const EYE_LEFT_CX = 148;
const EYE_RIGHT_CX = 252;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 272;
const MOUTH_OPEN_DEPTH = 22;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 102;
const EAR_RIGHT_PIVOT_X = 298;
const EAR_PIVOT_Y = 160;
const CHIN_Y = 292;

export default function Buffalo({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...BUFFALO_EXPRESSIONS.neutral };
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

    function drawEars(t) {
      const twitch = reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.9) - 0.97) * 120;
      el.earL.setAttribute('transform', `rotate(${-cur.ear - twitch} ${EAR_LEFT_PIVOT_X} ${EAR_PIVOT_Y})`);
      el.earR.setAttribute('transform', `rotate(${cur.ear} ${EAR_RIGHT_PIVOT_X} ${EAR_PIVOT_Y})`);
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
      const target = BUFFALO_EXPRESSIONS[emotionRef.current] || BUFFALO_EXPRESSIONS.neutral;
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
      drawEars(t);
      drawHead(t);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (name) => (node) => { r.current[name] = node; };

  return (
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú trâu">
      <defs>
        <linearGradient id="buffaloSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8A93A3" />
          <stop offset="1" stopColor="#5E6676" />
        </linearGradient>
        <clipPath id="buffaloEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="buffaloEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M156 92 C112 92 66 86 42 56 C52 92 100 118 150 122 Z" fill="#EDE3CF" />
        <path d="M244 92 C288 92 334 86 358 56 C348 92 300 118 250 122 Z" fill="#EDE3CF" />
        <g ref={set('earL')}>
          <path d="M104 150 C72 138 46 146 36 162 C56 176 82 174 108 168 Z" fill="url(#buffaloSkin)" />
          <path d="M96 154 C76 148 58 152 50 161 C64 168 82 167 98 164 Z" fill="#E9B7B0" />
        </g>
        <g ref={set('earR')}>
          <path d="M296 150 C328 138 354 146 364 162 C344 176 318 174 292 168 Z" fill="url(#buffaloSkin)" />
          <path d="M304 154 C324 148 342 152 350 161 C336 168 318 167 302 164 Z" fill="#E9B7B0" />
        </g>
        <path d="M200 96 C280 96 318 132 316 190 C314 236 270 252 200 252 C130 252 86 236 84 190 C82 132 120 96 200 96 Z" fill="url(#buffaloSkin)" />
        <path d="M176 100 Q188 120 200 108 Q212 120 224 100 Q200 90 176 100 Z" fill="#4A515E" />
        <ellipse cx="200" cy="248" rx="92" ry="44" fill="#B3B9C4" />
        <ellipse ref={set('blushL')} cx="110" cy="208" rx="14" ry="7" fill="#E9A3A8" />
        <ellipse ref={set('blushR')} cx="290" cy="208" rx="14" ry="7" fill="#E9A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="buffaloEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="buffaloEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <ellipse cx="172" cy="238" rx="9" ry="6" fill="#3A404B" />
        <ellipse cx="228" cy="238" rx="9" ry="6" fill="#3A404B" />
        <path ref={set('mouth')} fill="#262B33" stroke="#262B33" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#262B33" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#buffaloSkin)" />
        <path ref={edge} stroke="#3A404B" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#262B33" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
