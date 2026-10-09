import { useEffect, useRef } from 'react';
import { ROOSTER_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 20;
const EYE_CY = 166;
const EYE_LEFT_CX = 150;
const EYE_RIGHT_CX = 250;
const PUPIL_BASE_R = 10;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const BEAK_HINGE_Y = 214;
const BEAK_OPEN_DEPTH = 16;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const CHIN_Y = 290;

export default function Rooster({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...ROOSTER_EXPRESSIONS.neutral };
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

    function drawBeak() {
      const open = Math.min(1, cur.mo + speakOpen * 0.75) * BEAK_OPEN_DEPTH;
      el.beakInside.setAttribute('d', `M184 ${BEAK_HINGE_Y} L216 ${BEAK_HINGE_Y} L200 ${BEAK_HINGE_Y + 16 + open} Z`);
      el.lowerBeak.setAttribute('transform', `translate(0 ${open})`);
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
      const target = ROOSTER_EXPRESSIONS[emotionRef.current] || ROOSTER_EXPRESSIONS.neutral;
      for (const k in target) cur[k] = lerp(cur[k], target[k], EXPRESSION_EASE);

      updateBlink(now);
      gaze = readGaze(el.svg, FACE_CENTER, EYE_R - PUPIL_BASE_R);
      const level = levelRef.current ? levelRef.current(t) : 0;
      speakOpen = lerp(speakOpen, level, SPEAK_EASE);

      drawBeak();
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú gà">
      <defs>
        <linearGradient id="roosterSkin" x1="0" y1="90" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFA" />
          <stop offset="1" stopColor="#F1E7D2" />
        </linearGradient>
        <clipPath id="roosterEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="roosterEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M150 116 C138 86 158 70 176 88 C176 62 206 54 214 84 C224 62 254 68 248 98 C266 96 272 118 254 124 Z" fill="#E5483C" />
        <path d="M200 96 C272 96 316 140 316 196 C316 256 266 290 200 290 C134 290 84 256 84 196 C84 140 128 96 200 96 Z" fill="url(#roosterSkin)" stroke="#E2D6BC" strokeWidth="3" />
        <ellipse ref={set('blushL')} cx="116" cy="214" rx="14" ry="7" fill="#F6A6A0" />
        <ellipse ref={set('blushR')} cx="284" cy="214" rx="14" ry="7" fill="#F6A6A0" />

        <Eye cx={EYE_LEFT_CX} clip="roosterEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="roosterEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('beakInside')} fill="#7A2A22" />
        <g ref={set('lowerBeak')}>
          <path d="M186 228 Q180 258 196 264 Q212 258 206 228 Z" fill="#E5483C" />
          <path d="M184 216 L216 216 L200 236 Z" fill="#E8901A" strokeLinejoin="round" stroke="#E8901A" strokeWidth="3" />
        </g>
        <path d="M176 204 Q200 194 224 204 L200 232 Z" fill="#F5A623" strokeLinejoin="round" stroke="#F5A623" strokeWidth="3" />
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
          <circle r={PUPIL_BASE_R} fill="#2E2418" />
          <circle cx="3" cy="-3" r="3.0" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#roosterSkin)" />
        <path ref={edge} stroke="#C8B898" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 10} ${EYE_CY + 5} Q${cx} ${EYE_CY - 10} ${cx + 10} ${EYE_CY + 5}`}
        stroke="#2E2418" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
