import { useEffect, useRef } from 'react';
import { CANCER_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 22;
const EYE_CY = 120;
const EYE_LEFT_CX = 150;
const EYE_RIGHT_CX = 250;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 232;
const MOUTH_OPEN_DEPTH = 26;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 86;
const EAR_RIGHT_PIVOT_X = 314;
const EAR_PIVOT_Y = 206;
const CHIN_Y = 284;

export default function Cancer({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...CANCER_EXPRESSIONS.neutral };
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
      const target = CANCER_EXPRESSIONS[emotionRef.current] || CANCER_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Cự Giải">
      <defs>
        <linearGradient id="cancerSkin" x1="0" y1="130" x2="0" y2="284" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7866A" />
          <stop offset="1" stopColor="#D9482F" />
        </linearGradient>
        <clipPath id="cancerEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="cancerEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M70 236 L34 250 M76 258 L42 278 M330 236 L366 250 M324 258 L358 278" stroke="#C23E28" strokeWidth="10" strokeLinecap="round" fill="none" />
        <g ref={set('earL')}>
          <path d="M86 206 C62 196 50 172 58 150" stroke="#D9482F" strokeWidth="16" strokeLinecap="round" fill="none" />
          <path d="M58 150 C30 140 30 100 60 92 C58 110 66 120 78 122 C84 108 92 100 98 104 C96 130 80 150 58 150 Z" fill="url(#cancerSkin)" stroke="#C23E28" strokeWidth="3" />
        </g>
        <g ref={set('earR')}>
          <path d="M314 206 C338 196 350 172 342 150" stroke="#D9482F" strokeWidth="16" strokeLinecap="round" fill="none" />
          <path d="M342 150 C370 140 370 100 340 92 C342 110 334 120 322 122 C316 108 308 100 302 104 C304 130 320 150 342 150 Z" fill="url(#cancerSkin)" stroke="#C23E28" strokeWidth="3" />
        </g>
        <path d="M150 176 L150 132 M250 176 L250 132" stroke="#D9482F" strokeWidth="12" strokeLinecap="round" />
        <circle cx="150" cy="120" r="27" fill="#E2553A" />
        <circle cx="250" cy="120" r="27" fill="#E2553A" />
        <path d="M200 140 C290 140 344 176 344 216 C344 258 280 284 200 284 C120 284 56 258 56 216 C56 176 110 140 200 140 Z" fill="url(#cancerSkin)" />
        <circle cx="128" cy="174" r="7" fill="#FFB3A0" opacity=".6" />
        <circle cx="272" cy="174" r="7" fill="#FFB3A0" opacity=".6" />
        <circle cx="200" cy="162" r="9" fill="#FFB3A0" opacity=".6" />
        <ellipse ref={set('blushL')} cx="120" cy="204" rx="15" ry="8" fill="#FFB3A0" />
        <ellipse ref={set('blushR')} cx="280" cy="204" rx="15" ry="8" fill="#FFB3A0" />

        <Eye cx={EYE_LEFT_CX} clip="cancerEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="cancerEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />


        <path ref={set('mouth')} fill="#3A1610" stroke="#3A1610" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#3A1610" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#cancerSkin)" />
        <path ref={edge} stroke="#A8321F" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#3A1610" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
