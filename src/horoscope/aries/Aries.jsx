import { useEffect, useRef } from 'react';
import { ARIES_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 21;
const EYE_CY = 168;
const EYE_LEFT_CX = 152;
const EYE_RIGHT_CX = 248;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 252;
const MOUTH_OPEN_DEPTH = 24;
const PHILTRUM_TOP_Y = 232;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const CHIN_Y = 286;

export default function Aries({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...ARIES_EXPRESSIONS.neutral };
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
      el.philtrum.setAttribute('d', `M200 ${PHILTRUM_TOP_Y} L200 ${y + c / 2}`);
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
      const target = ARIES_EXPRESSIONS[emotionRef.current] || ARIES_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Bạch Dương">
      <defs>
        <linearGradient id="ariesSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6EBDA" />
          <stop offset="1" stopColor="#E2CBA8" />
        </linearGradient>
        <clipPath id="ariesEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="ariesEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M200 96 C270 96 310 140 308 196 C306 250 262 286 200 286 C138 286 94 250 92 196 C90 140 130 96 200 96 Z" fill="url(#ariesSkin)" />
        <ellipse cx="200" cy="242" rx="50" ry="34" fill="#FBF4EA" />
        <circle cx="150" cy="106" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="175" cy="94" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="200" cy="90" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="225" cy="94" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="250" cy="106" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="128" cy="124" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <circle cx="272" cy="124" r="26" fill="#FFFDF7" stroke="#E9DFCF" strokeWidth="3" />
        <path d="M122 118 C84 92 44 120 50 158 C56 192 102 196 110 164 C116 140 92 130 80 148" stroke="#C8955A" strokeWidth="20" strokeLinecap="round" fill="none" />
        <path d="M122 118 C84 92 44 120 50 158 C56 192 102 196 110 164 C116 140 92 130 80 148" stroke="#A8743E" strokeWidth="20" strokeDasharray="3 11" fill="none" />
        <path d="M278 118 C316 92 356 120 350 158 C344 192 298 196 290 164 C284 140 308 130 320 148" stroke="#C8955A" strokeWidth="20" strokeLinecap="round" fill="none" />
        <path d="M278 118 C316 92 356 120 350 158 C344 192 298 196 290 164 C284 140 308 130 320 148" stroke="#A8743E" strokeWidth="20" strokeDasharray="3 11" fill="none" />
        <ellipse ref={set('blushL')} cx="120" cy="212" rx="14" ry="7" fill="#F4A3A8" />
        <ellipse ref={set('blushR')} cx="280" cy="212" rx="14" ry="7" fill="#F4A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="ariesEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="ariesEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#3A2C20" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M189 222 Q200 216 211 222 Q206 231 200 233 Q194 231 189 222 Z" fill="#D98A8A" />
        <path ref={set('mouth')} fill="#3A2C20" stroke="#3A2C20" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#3A2C20" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#ariesSkin)" />
        <path ref={edge} stroke="#A88A62" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#3A2C20" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
